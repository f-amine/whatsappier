import { prisma } from '@/lib/db';
import { Automation, Prisma, RunStatus } from '@prisma/client'; // Import Prisma, RunStatus
import { getAutomationTemplateById } from '../templates/registry';
import { executeLfOrderToWhatsapp } from '../execution/lf-order-to-whatsapp';
import { GeminiService, ReplyClassification } from '../helpers/ai-service';

type ExecutionFunction = (
    automation: Automation,
    triggerPayload: any,
    config: any,
    runId: string
) => Promise<void>;

const executionLogicMap: Record<string, ExecutionFunction> = {
    'executeLfOrderToWhatsapp': executeLfOrderToWhatsapp,
};

export class AutomationExecutor {

    static async startExecution(automationId: string, triggerPayload: any) {
        // ... (startExecution logic remains the same as the previous version)
         console.log(`Starting execution for automation: ${automationId}`);
         let automation: Automation | null = null;
         let run: { id: string } | null = null;

         try {
             // 1. Fetch automation
             automation = await prisma.automation.findUnique({ where: { id: automationId } });
             if (!automation || !automation.isActive) { console.warn(`Automation ${automationId} not found or inactive.`); return; }

             // 2. Create Run record
             run = await prisma.run.create({
                 data: {
                     automationId: automation.id,
                     userId: automation.userId,
                     status: RunStatus.RUNNING,
                     triggerPayload: triggerPayload as Prisma.JsonObject,
                     startedAt: new Date(),
                     connectionId: automation.connectionId,
                     templateId: automation.templateId,
                 },
                 select: { id: true }
             });
             console.log(`Created run record: ${run.id}`);

             // 3. Find template definition
             const template = getAutomationTemplateById(automation.templateDefinitionId);
             if (!template) throw new Error(`Automation template definition '${automation.templateDefinitionId}' not found.`);

             // 4. Get execution logic
             const execute = executionLogicMap[template.executionLogicIdentifier];
             if (!execute) throw new Error(`Execution logic '${template.executionLogicIdentifier}' not implemented.`);

             // 5. Validate config
             const configValidation = template.configSchema.safeParse(automation.config);
             if (!configValidation.success) {
                  console.error(`[Config Validation Error] Automation ${automationId}:`, configValidation.error.errors);
                  throw new Error(`Stored config for automation ${automationId} is invalid.`);
             }
             const validatedConfig = configValidation.data;

             // 6. Execute the logic
             await execute(automation, triggerPayload, validatedConfig, run.id);

             // 7. Update Run status (check if still RUNNING)
             const currentRunState = await prisma.run.findUnique({ where: { id: run.id }, select: { status: true } });
             if (currentRunState?.status === RunStatus.RUNNING) {
                 await prisma.run.update({
                     where: { id: run.id },
                     data: { status: RunStatus.SUCCEEDED, finishedAt: new Date() },
                 });
                 console.log(`Execution successful for run: ${run.id} (marked as SUCCEEDED)`);
             } else {
                  console.log(`Run ${run.id} status is ${currentRunState?.status}, not updating to SUCCEEDED.`);
             }

         } catch (error: any) {
             console.error(`[Execution Error] Automation ${automationId}, Run ${run?.id}:`, error);
             // 8. Update Run to FAILED
             if (run?.id) {
                 await prisma.run.update({
                     where: { id: run.id },
                     data: { status: RunStatus.FAILED, finishedAt: new Date(), errorMessage: error.message || 'Unknown execution error' },
                 }).catch(updateErr => console.error(`[DB Error] Failed to update run ${run?.id} to FAILED:`, updateErr));
             }
         }
    } // end startExecution

    // --- NEW METHOD to process replies ---
    static async processReply(runId: string, replyText: string, replyMessageId: string) {
        console.log(`[Executor] Processing reply for Run ID: ${runId}`);
        let run = null;
        let automation = null;
        let template = null;

        try {
            // 1. Fetch Run and associated Automation
            run = await prisma.run.findUnique({
                where: { id: runId },
                include: { automation: true } // Include automation data
            });

            if (!run) {
                console.error(`[Executor] Run ${runId} not found during reply processing.`);
                // No run to update, maybe log this?
                return; // Exit gracefully
            }
            if (run.status !== RunStatus.WAITING_REPLY && run.status !== RunStatus.PROCESSING_REPLY) {
                // Avoid processing if already completed, failed, or not waiting
                console.warn(`[Executor] Run ${runId} is not in WAITING_REPLY or PROCESSING_REPLY state (current: ${run.status}). Skipping reply processing.`);
                return;
            }

            automation = run.automation;
            if (!automation) {
                throw new Error(`Automation data missing for Run ${runId}.`);
            }

            // 2. Get Template Definition
            template = getAutomationTemplateById(automation.templateDefinitionId);
            if (!template) {
                throw new Error(`Automation template definition '${automation.templateDefinitionId}' not found for Run ${runId}.`);
            }

            // 3. Check if this template handles replies
            if (!template.awaitsReply) {
                console.warn(`[Executor] Received reply for Run ${runId}, but template '${template.id}' does not expect replies. Ignoring.`);
                // Optional: Update status to SUCCEEDED if you consider this 'done'
                // await prisma.run.update({ where: { id: runId }, data: { status: RunStatus.SUCCEEDED, finishedAt: new Date() }});
                return;
            }

            // In the future, this could be delegated based on template.replyLogicIdentifier
            let classification: ReplyClassification;
            let aiError: string | null = null;
            try {
                // Assuming Gemini is the only reply logic for now
                classification = await GeminiService.classifyOrderReply(replyText);
                console.log(`[Executor] AI classification for Run ${runId}: ${classification}`);
            } catch (error: any) {
                console.error(`[Executor] AI classification failed for Run ${runId}:`, error);
                classification = 'UNCLEAR';
                aiError = error.message;
            }

            // 6. Determine Final Status and Prepare Result Data
            const finalStatus = aiError ? RunStatus.FAILED : RunStatus.SUCCEEDED;
            const finalErrorMessage = aiError ? `AI Error: ${aiError}` : run.errorMessage; // Keep previous errors if AI was skipped/failed
            const aiResultJson = {
                 classification: classification,
                 rawReply: replyText,
                 processedAt: new Date().toISOString(), // Add timestamp
                 error: aiError
            } as Prisma.JsonObject;

            // 7. Update Run with Final Status and Result
            await prisma.run.update({
                where: { id: runId },
                data: {
                    status: finalStatus,
                    finishedAt: new Date(),
                    aiResult: aiResultJson,
                    errorMessage: finalErrorMessage,
                }
            });
            console.log(`[Executor] Run ${runId} updated to final status: ${finalStatus}`);

            // 8. Trigger Subsequent Actions (if needed)
            if (finalStatus === RunStatus.SUCCEEDED) {
                // Check classification and trigger downstream events/updates
                // e.g., await OrderService.updateBasedOnAi(runId, classification);
            }

        } catch (error: any) {
            console.error(`[Executor] Critical error processing reply for Run ${run?.id ?? runId}:`, error);
            // Attempt to mark the run as FAILED if possible
            if (run?.id) {
                 await prisma.run.update({
                     where: { id: run.id },
                     data: {
                         status: RunStatus.FAILED,
                         finishedAt: new Date(),
                         errorMessage: `Reply Processing Error: ${error.message}`,
                     },
                 }).catch(updateErr => console.error(`[Executor DB Error] Failed to update run ${run?.id} to FAILED after reply processing error:`, updateErr));
            }
        }
    } // end processReply

} // end class AutomationExecutor
