import { Automation, Prisma, Run, RunStatus } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { LfAbandonedCheckoutRecoveryConfigSchema } from '../templates/definitions/lf-abandoned-checkout-recovery';
import { processPhoneNumber } from '../helpers/utils';
import { automationQueue } from '@/lib/queue'; 
import { LightFunnelsService, OrderFinancialStatus } from '../helpers/lightfunnels'; 
import { WhatsAppService } from '../helpers/whatsapp'; 
import { Platform } from '@prisma/client'; 


type Config = z.infer<typeof LfAbandonedCheckoutRecoveryConfigSchema>;

interface LightfunnelsCheckoutCreatedPayload {
  node: {
    id: string;
    contact_email?: string;
    contact_phone?: string;
    shipping_address?: { country_code?: string | null };
    billing_address?: { country_code?: string | null };
    customer?: { full_name?: string | null };
    recover_url?: string; // Ensure this exists!
    funnel_id?: string;
    created_at?: string;
  }
}

/**
 * Handles the initial trigger for LF Abandoned Checkout Recovery.
 * Adds a delayed job to the queue.
 */
export async function executeLfAbandonedCheckoutRecovery(
  automation: Automation,
  triggerPayload: LightfunnelsCheckoutCreatedPayload,
  config: Config,
  runId: string
): Promise<void> {

  console.log(`[LF Abandoned Checkout] Initializing run ${runId} for automation ${automation.id}`);

  // --- Payload Validation ---
   if (!triggerPayload.node?.id) {
     await prisma.run.update({ where: { id: runId}, data: {status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: "Invalid trigger payload: Missing checkout ID."}});
     throw new Error("Invalid trigger payload: Missing checkout ID."); 
   }
  const checkoutData = triggerPayload.node;
  const checkoutId = checkoutData.id;
  const recoveryUrl = checkoutData.recover_url;
  const customerPhoneRaw = checkoutData.contact_phone;

  if (!recoveryUrl) {
    console.warn(`[LF Abandoned Checkout] Missing recovery URL for checkout ${checkoutId}. Failing run ${runId}.`);
    await prisma.run.update({
      where: { id: runId },
      data: { status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: "Missing recovery URL in checkout payload." },
    });
    return;
  }
  if (!customerPhoneRaw) {
    console.log(`[LF Abandoned Checkout] Skipping run ${runId}: No phone number.`);
    await prisma.run.update({
      where: { id: runId },
      data: { status: RunStatus.CANCELLED, finishedAt: new Date(), errorMessage: "No phone number provided." },
    });
    return;
  }

  const processedPhone = processPhoneNumber(
    customerPhoneRaw,
    checkoutData.shipping_address?.country_code,
    checkoutData.billing_address?.country_code
  );
  if (!processedPhone.isValid || !processedPhone.phoneNumber) {
     await prisma.run.update({ where: { id: runId}, data: {status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: "Invalid or unformattable phone number."}});
     throw new Error("Customer phone number is invalid or could not be formatted.");
  }
  const customerPhone = processedPhone.phoneNumber;

  if (!config.whatsappDeviceId || !config.messageTemplateId || !config.lightfunnelsConnectionId) {
     await prisma.run.update({ where: { id: runId}, data: {status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: "Missing required configuration."}});
     throw new Error("Missing required configuration.");
  }

  const delayMinutes = config.delayMinutes >= 5 ? config.delayMinutes : 20;
  const delayMilliseconds = delayMinutes * 60 * 1000;

  const runContext: Prisma.JsonObject = {
      checkoutId: checkoutId,
      recoveryUrl: recoveryUrl, // Essential for the message
      lightfunnelsConnectionId: config.lightfunnelsConnectionId,
      whatsappDeviceId: config.whatsappDeviceId,
      messageTemplateId: config.messageTemplateId,
  };

  try {
    await prisma.run.update({
        where: { id: runId },
        data: {
            status: RunStatus.RUNNING, 
            context: runContext,
            phoneNumber: customerPhone,
            connectionId: config.lightfunnelsConnectionId,
            templateId: config.messageTemplateId,
        },
    });

    const job = await automationQueue.add(
      'resume-abandoned-checkout', 
      { runId: runId },           
      { delay: delayMilliseconds } 
    );
    console.log(`[LF Abandoned Checkout] Run ${runId}: Scheduled job ${job.id} with ${delayMinutes} min delay.`);

  } catch (error: any) {
    console.error(`[LF Abandoned Checkout] Run ${runId}: Failed to add job to queue or update run:`, error);
    await prisma.run.update({
      where: { id: runId },
      data: { status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: `Failed to schedule recovery job: ${error.message}` },
    }).catch(dbErr => console.error(`[DB Error] Failed update run ${runId} to FAILED after scheduling error:`, dbErr));
    throw error;
  }
}


// --- Resume Logic (Remains the same, called by BullMQ Worker) ---
// Ensure all necessary prisma queries are within this function
export async function resumeLfAbandonedCheckoutRecovery(runId: string): Promise<{ success: boolean, message?: string }> {
    console.log(`[LF Abandoned Checkout] Worker attempting to resume run ${runId}`);

    try {
        // 1. Fetch the run within the resume logic for atomicity
        // Make sure to include all necessary relations!
        const run = await prisma.run.findUnique({
             where: { id: runId },
             include: {
                automation: true,
                Connection: true, 
                Template: true
             }
        });

      const device = await prisma.device.findUnique({ where: { id: run.automation.deviceId} });
        if (!run) {
             throw new Error(`Run ${runId} not found.`);
        }

        // Prevent reprocessing if status is not RUNNING (or potentially SCHEDULED if you used that)
        if (run.status !== RunStatus.RUNNING) {
            console.log(`[LF Abandoned Checkout] Run ${runId} is not in RUNNING state (current: ${run.status}). Skipping resume.`);
            return { success: true, message: `Run not in RUNNING state.` }; // Success from worker perspective
        }


        // 2. Extract Context and Validate Resources
        const context = run.context as any;
        if (!context || !context.recoveryUrl || !run.phoneNumber || !run.connectionId || !run.deviceId || !run.templateId) {
            throw new Error("Missing required context/relations in Run record.");
        }
        if (!run.Connection) throw new Error("Lightfunnels connection not found.");
        if (run.Connection.platform !== Platform.LIGHTFUNNELS) throw new Error("Invalid connection type.");
        if (!run.automation.deviceId) throw new Error("WhatsApp device not found.");
        if (device.status !== 'CONNECTED') throw new Error(`WhatsApp device ${device.id} is not connected.`);
        if (!run.Template) throw new Error("Message template not found.");

        const lfCredentials = run.Connection.credentials as { accessToken: string };
        if (!lfCredentials?.accessToken) throw new Error("Missing Lightfunnels access token.");

        const lfService = new LightFunnelsService(lfCredentials.accessToken);
        let isCompleted = false;
        try {
            const associatedOrders = await lfService.getOrders({
                 financialStatus: OrderFinancialStatus.PAID,
                 first: 1
            });
             isCompleted = associatedOrders.edges.length > 0;

             console.log(`[LF Abandoned Checkout] Run ${run.id}: Checkout status check result: ${isCompleted ? 'Completed' : 'Abandoned'}`);

        } catch (lfError: any) {
            console.error(`[LF API Error] Run ${run.id}: Error checking checkout status:`, lfError);
            throw new Error(`Failed to check Lightfunnels status: ${lfError.message}`);
        }

        if (isCompleted) {
            console.log(`[LF Abandoned Checkout] Run ${run.id}: Checkout completed. Finishing run.`);
            await prisma.run.update({
                where: { id: run.id },
                data: { status: RunStatus.SUCCEEDED, finishedAt: new Date(), errorMessage: "Checkout Completed" },
            });
        } else {
            console.log(`[LF Abandoned Checkout] Run ${run.id}: Sending recovery message.`);

            // Prepare variables
            const templateVariables: Record<string, string> = {
                customer_name: context.customerName || "there",
                recovery_url: context.recoveryUrl,
            };

            const whatsappService = WhatsAppService.fromDevice(device);
            await whatsappService.sendTemplate(
                run.phoneNumber, // Use phone from Run record
                run.Template.content,
                templateVariables
            );

            console.log(`[LF Abandoned Checkout] Run ${run.id}: Recovery message sent.`);
            await prisma.run.update({
                where: { id: run.id },
                data: { status: RunStatus.SUCCEEDED, finishedAt: new Date() },
            });
        }
        return { success: true };

    } catch (error: any) {
        console.error(`[LF Abandoned Checkout] Error resuming run ${runId} in worker:`, error);
        // Let the workerProcessor catch this and update the DB status
        // Return failure to BullMQ
        return { success: false, message: error.message };
    }
}
