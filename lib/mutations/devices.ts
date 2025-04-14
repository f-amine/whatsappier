'use server'

import { prisma } from "../db"
import { getCurrentUser } from "../sessions"
import { revalidatePath } from "next/cache"
import { statusMap } from "../utils"
import { env } from "@/env.mjs"
import { QRCodeResponse, WebhookConfig, WebhookEvent, WhatsappInstanceData, WhatsappInstanceResponse, WhatsAppService } from "../automations/helpers/whatsapp"
import { Prisma } from "@prisma/client"


const globalWhatsAppService = new WhatsAppService(env.AP_WHATSAPPIER_API_KEY, env.AP_WHATSAPPIER_SERVER_URL);


export async function createWhatsappInstance(
    instanceData: WhatsappInstanceData
): Promise<WhatsappInstanceResponse> {
    const user = await getCurrentUser();
    if (!user) throw new Error("Unauthorized");
    if (!globalWhatsAppService) throw new Error("WhatsApp Service is not configured.");

    // Prepare payload for instance creation (without webhook fields initially)
    const creationPayload: WhatsappInstanceData = {
        instanceName: instanceData.instanceName,
        number: instanceData.number,
        qrcode: instanceData.qrcode ?? true, // Default to true if not specified
        integration: instanceData.integration,
        ...(instanceData.token && { token: instanceData.token }),
        ...(instanceData.businessId && { businessId: instanceData.businessId }),
    };

    let createdInstanceName: string | null = null;
    let createdDeviceId: string | null = null;

    try {
        console.log(`Attempting to create WhatsApp instance "${instanceData.instanceName}"...`);
        console.log("Sending creation payload:", JSON.stringify(creationPayload, null, 2));
        const whatsappResponse = await globalWhatsAppService.createInstance(creationPayload);
        createdInstanceName = whatsappResponse.instance.instanceName; // Store name for potential cleanup/webhook setup
        console.log(`Instance "${createdInstanceName}" created via API. Response:`, whatsappResponse);

        // Store device in DB *before* setting webhook
        const newDevice = await prisma.device.create({
            data: {
                userId: user.id,
                name: createdInstanceName,
                phoneNumber: instanceData.number || '',
                status: whatsappResponse.instance.status === 'connected' ? 'CONNECTED' : 'DISCONNECTED',
                metadata: {
                    instanceApiKey: whatsappResponse.hash?.apikey,
                    settings: whatsappResponse.settings || {},
                    webhookConfigured: false, // Mark as not configured initially
                    webhookUrl: null,
                    qrcode: whatsappResponse.qrcode ? whatsappResponse.qrcode.base64 : null
                } as Prisma.JsonObject,
            },
            select: { id: true } // Select ID for potential cleanup
        });
        createdDeviceId = newDevice.id; // Store DB id

        // --- Set Webhook using the dedicated endpoint ---
        const webhookUrl = `${env.WEBHOOKS_URL}/api/webhooks/whatsapp/${createdInstanceName}`;
        const webhookConfigPayload: WebhookConfig = {
            enabled: true,
            url: webhookUrl, // Use 'url' key as per /webhook/set docs
            events: [
                WebhookEvent.MESSAGES_UPSERT,
                WebhookEvent.CONNECTION_UPDATE,
            ],
             
        };

        console.log(`Setting webhook for instance "${createdInstanceName}"... Payload:`, webhookConfigPayload);
        // Create a service instance *with* the name to call setWebhook
        const instanceService = new WhatsAppService(env.AP_WHATSAPPIER_API_KEY!, env.AP_WHATSAPPIER_SERVER_URL!, createdInstanceName);
        await instanceService.setWebhook(webhookConfigPayload);
        console.log(`Webhook successfully set for instance "${createdInstanceName}".`);

        revalidatePath('/devices');
        return whatsappResponse; // Return the initial creation response

    } catch (error: any) {
        console.error(`Failed during instance creation or webhook setup for "${instanceData.instanceName}":`, error);

        // --- Cleanup Attempt ---
        // If instance was created but webhook setup failed, try to delete the instance
        if (createdInstanceName && !error.message.includes("Webhook setup failed")) { // Avoid delete if webhook setup specifically failed after creation
             console.warn(`Attempting to delete instance "${createdInstanceName}" due to subsequent error...`);
             try {
                  const instanceService = new WhatsAppService(env.AP_WHATSAPPIER_API_KEY!, env.AP_WHATSAPPIER_SERVER_URL!, createdInstanceName);
                  await instanceService.deleteInstance();
                  console.log(`Instance "${createdInstanceName}" deleted during cleanup.`);
             } catch (deleteError: any) {
                  console.error(`Failed to delete instance "${createdInstanceName}" during cleanup:`, deleteError);
             }
        }
        // Also delete from DB if it was created
        if(createdDeviceId) {
            await prisma.device.delete({ where: { id: createdDeviceId }})
                  .catch(dbDeleteError => console.error(`Failed to delete device record ${createdDeviceId} from DB during cleanup:`, dbDeleteError));
        }
        // --- End Cleanup ---

        throw new Error(`Failed to create instance or set webhook: ${error.response?.message || error.response?.error || error.message}`);
    }
}


/**
 * Checks the connection status of a given instance name.
 */
export async function checkConnectionStatus(instanceName: string) {
     if (!globalWhatsAppService) throw new Error("WhatsApp Service is not configured.");
     if (!instanceName) throw new Error("Instance name is required.");

     // Create a temporary service instance *with* the name for this specific call
     const instanceService = new WhatsAppService(
        env.AP_WHATSAPPIER_API_KEY!,
        env.AP_WHATSAPPIER_SERVER_URL!,
        instanceName
     );

     try {
        const result = await instanceService.getConnectionState();
        const deviceStatus = statusMap[result.instance.state] || 'ERROR'; // Default to ERROR if state unknown

        console.log(`Connection state for ${instanceName}: ${result.instance.state} -> ${deviceStatus}`);

        // Update DB status
        await prisma.device.update({
            where: { name: instanceName },
            data: { status: deviceStatus },
        });

        // No need to set webhook here anymore
        revalidatePath('/devices'); // May not be needed if only status changes, but safe

        return {
            success: true,
            connected: result.instance.state === 'open',
            status: deviceStatus,
        };
     } catch (error: any) {
         console.error(`Failed to check connection status for ${instanceName}:`, error);
         // Attempt to update status to ERROR in DB if check fails
         await prisma.device.update({
             where: { name: instanceName },
             data: { status: 'ERROR' },
         }).catch(dbErr => console.error(`Failed to update device ${instanceName} status to ERROR:`, dbErr));

         throw new Error(`Failed to check status: ${error.response?.message || error.response?.error || error.message}`);
     }
}


export async function logoutDeviceAction(deviceId: string) {
    const user = await getCurrentUser(); // Ensure user context if needed for permissions
    if (!user) throw new Error("Unauthorized");

    const device = await prisma.device.findFirst({
        where: { id: deviceId, userId: user.id }, // Ensure user owns device
        select: { name: true }
    });
    if (!device) throw new Error("Device not found or access denied.");
    if (!globalWhatsAppService) throw new Error("WhatsApp Service is not configured.");

    // Create service instance for this device
    const instanceService = WhatsAppService.fromDevice(device);

    try {
        console.log(`Logging out instance "${device.name}"...`);
        const result = await instanceService.logoutInstance();

        // API might return boolean true or object with status
        if (result?.status === false || result?.error) {
             throw new Error( result.message || 'Logout API call failed');
        }

        console.log(`Instance "${device.name}" logged out via API.`);

        // Update DB status
        await prisma.device.update({
            where: { id: deviceId },
            data: {
                status: 'DISCONNECTED',
                metadata: Prisma.JsonNull // Clear metadata on logout
            }
        });

        revalidatePath('/devices');
        return { success: true };
    } catch (error: any) {
        console.error(`Failed to logout WhatsApp instance "${device.name}":`, error);
        await prisma.device.update({ where: { id: deviceId }, data: { status: 'ERROR' } })
              .catch(dbErr => console.error(`Failed to update device ${deviceId} status to ERROR after logout failure:`, dbErr));
        throw new Error(`Logout failed: ${error.response?.message || error.response?.error || error.message}`);
    }
}

/**
 * Deletes a specific device instance (logs out first if connected).
 */
export async function deleteDeviceAction(deviceId: string) {
     const user = await getCurrentUser();
     if (!user) throw new Error("Unauthorized");

     const device = await prisma.device.findFirst({
         where: { id: deviceId, userId: user.id },
         select: { name: true, status: true }
     });
     if (!device) throw new Error("Device not found or access denied.");
     if (!globalWhatsAppService) throw new Error("WhatsApp Service is not configured.");

     // Create service instance for this device
     const instanceService = WhatsAppService.fromDevice(device);

     try {
         // Logout first if connected
         if (device.status === 'CONNECTED' || device.status === 'CONNECTING') {
             console.log(`Device "${device.name}" is ${device.status}. Attempting logout before delete...`);
             try {
                 await instanceService.logoutInstance();
                 console.log(`Logout successful for "${device.name}" before delete.`);
                 // Update status locally before delete attempt
                 await prisma.device.update({ where: { id: deviceId }, data: { status: 'DISCONNECTED', metadata: Prisma.JsonNull }});
             } catch (logoutError: any) {
                  console.warn(`Logout failed for "${device.name}" during delete, proceeding with delete anyway:`, logoutError.message);
                  // Still try to delete the instance from the provider
             }
         }

         // Delete from WhatsApp provider
         console.log(`Deleting instance "${device.name}" from provider...`);
         const result = await instanceService.deleteInstance();

         if (result?.status === false || result?.error) {
              throw new Error(result.message || 'Delete API call failed');
         }
         console.log(`Instance "${device.name}" deleted via API.`);

         // Delete from DB
         await prisma.device.delete({ where: { id: deviceId } });

         revalidatePath('/devices');
         return { success: true };

     } catch (error: any) {
         console.error(`Failed to delete WhatsApp instance "${device.name}":`, error);
         // Don't set to ERROR, as it's being deleted
         throw new Error(`Delete failed: ${error.response?.message || error.response?.error || error.message}`);
     }
}

/**
 * Bulk deletes devices.
 */
export async function bulkDeleteDevicesAction(deviceIds: string[]) {
  // Reuse single delete logic which includes logout
  const results = await Promise.allSettled(
    deviceIds.map(id => deleteDeviceAction(id)) // Call the refactored single delete action
  );

  const failures = results.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected'
  );

  if (failures.length > 0) {
    console.error("Failures during bulk device deletion:", failures.map(f => f.reason));
    throw new Error(`Failed to delete ${failures.length} out of ${deviceIds.length} devices. Check logs.`);
  }

  revalidatePath('/devices');
  return { success: true, count: deviceIds.length };
}

/**
 * Initiates the connection process for a device (gets QR code).
 */
export async function connectDeviceAction(deviceName: string): Promise<QRCodeResponse> {
     if (!globalWhatsAppService) throw new Error("WhatsApp Service is not configured.");
     if (!deviceName) throw new Error("Instance name is required.");

     // Create service instance for this device
     const instanceService = new WhatsAppService(
        env.AP_WHATSAPPIER_API_KEY!,
        env.AP_WHATSAPPIER_SERVER_URL!,
        deviceName
     );

     try {
         console.log(`Requesting QR code for instance "${deviceName}"...`);
         const result = await instanceService.connectInstance();

         // Update device status to CONNECTING in DB
         await prisma.device.update({
             where: { name: deviceName },
             data: {
                 status: 'CONNECTING',
                 // Store QR code in metadata temporarily if needed, ensure it's handled correctly
                 metadata: { ...(await prisma.device.findUnique({where:{name: deviceName}}))?.metadata as any || {}, qrCode: result?.base64 } as Prisma.JsonObject,
             }
         });
          revalidatePath('/devices'); // Revalidate after status update

         return result; // Return the QR data

     } catch (error: any) {
         console.error(`Failed to initiate connection for ${deviceName}:`, error);
          await prisma.device.update({ where: { name: deviceName }, data: { status: 'ERROR' } })
              .catch(dbErr => console.error(`Failed to update device ${deviceName} status to ERROR after connect failure:`, dbErr));
         throw new Error(`Connect failed: ${error.response?.message || error.response?.error || error.message}`);
     }
}
