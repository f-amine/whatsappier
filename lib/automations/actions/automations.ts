'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/sessions';
import { getAutomationTemplateById } from '@/lib/automations/templates/registry';
import { Prisma, TriggerType as PrismaTriggerType, Platform, Connection } from '@prisma/client';
// Remove direct LF Service import if not needed elsewhere here
// import { LightFunnelsService, WebhookType, WebhookVersion } from '../automations/helpers/lightfunnels';
import { env } from '@/env.mjs'; // For WEBHOOKS_URL
import { getTriggerSetupService } from '../triggers/trigger-service-registry';
import { AppTriggerType } from '@/types/automations-templates';
import { TriggerCleanupResult, TriggerSetupResult, TriggerSetupService } from '../triggers/types';

// Interface remains the same
interface CreateAutomationInstanceInput {
  templateDefinitionId: string;
  name: string;
  description?: string;
  config: any;
  connectionId?: string;
  deviceId?: string;
  templateId?: string;
  trigger: PrismaTriggerType;
  triggerConfig: Record<string, any>; // Should contain AppTriggerType
  isActive?: boolean;
}

export async function createAutomationInstance(data: CreateAutomationInstanceInput) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const template = getAutomationTemplateById(data.templateDefinitionId);
  if (!template) throw new Error(`Automation template '${data.templateDefinitionId}' not found.`);

  // 1. Validate config
  const validationResult = template.configSchema.safeParse(data.config);
  if (!validationResult.success) {
    throw new Error(`Configuration validation failed: ${validationResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
  }
  const validatedConfig = validationResult.data;

  // 2. Verify resources & get Connection object if needed for trigger setup
  let connection: Connection | null = null;
  if (data.connectionId) {
    connection = await prisma.connection.findFirst({ where: { id: data.connectionId, userId: user.id } });
    if (!connection) throw new Error("Selected connection not found or access denied.");
    if (template.requiredResources?.connections && !template.requiredResources.connections.includes(connection.platform)) {
        throw new Error(`Connection platform ${connection.platform} is not compatible with this template.`);
    }
  }
  // ... (keep device and template verification)
   if (data.deviceId) {
      const device = await prisma.device.findFirst({ where: { id: data.deviceId, userId: user.id } });
      if (!device) throw new Error("Selected device not found or access denied.");
      if (device.status !== 'CONNECTED') throw new Error("Selected device is not connected.");
  }
   if (data.templateId) {
      const msgTemplate = await prisma.template.findFirst({ where: { id: data.templateId, userId: user.id } });
      if (!msgTemplate) throw new Error("Selected message template not found or access denied.");
   }


  let newAutomationId: string | null = null;
  let triggerSetupResult: Awaited<ReturnType<NonNullable<ReturnType<typeof getTriggerSetupService>>['setup']>> | null = null;
  let triggerService = null;

  try {
    // 3. Create Automation Record first
    const newAutomation = await prisma.automation.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description,
        templateDefinitionId: data.templateDefinitionId,
        config: validatedConfig as Prisma.JsonObject,
        connectionId: data.connectionId,
        deviceId: data.deviceId,
        templateId: data.templateId,
        trigger: data.trigger,
        triggerConfig: data.triggerConfig as Prisma.JsonObject, // Initial config, might be updated
        isActive: data.isActive ?? true,
        metadata: { createdAt: new Date().toISOString() },
      },
      select: { id: true }
    });
    newAutomationId = newAutomation.id;

    let finalTriggerConfig = { ...data.triggerConfig }; 

    // 4. Setup External Triggers using Service Registry
    const appTriggerType = data.triggerConfig.type as AppTriggerType;
    const triggerPlatform = template.trigger.platform;

    if (triggerPlatform && appTriggerType && connection) {
      triggerService = getTriggerSetupService(triggerPlatform, appTriggerType);

      if (triggerService) {
        console.log(`Using Trigger Service: ${triggerService.constructor.name} for platform ${triggerPlatform}, type ${appTriggerType}`);
        const webhookUrlBase = `${env.WEBHOOKS_URL}/api/webhooks/generic`; // Base URL for generic handler

        triggerSetupResult = await triggerService.setup({
          automationId: newAutomationId,
          userId: user.id,
          connection: connection, // Pass the fetched connection
          triggerType: appTriggerType,
          webhookUrlBase: webhookUrlBase,
        });

        // Merge the setup result into the config
        finalTriggerConfig = {
          ...finalTriggerConfig,
          ...triggerSetupResult,
        };
      } else {
         console.log(`No specific trigger setup service found for ${triggerPlatform} / ${appTriggerType}. Proceeding without external setup.`);
      }
    }

    // 5. Update the automation record with the final triggerConfig
    const fullyCreatedAutomation = await prisma.automation.update({
      where: { id: newAutomationId },
      data: {
        triggerConfig: finalTriggerConfig as Prisma.JsonObject,
      }
    });

    revalidatePath('/automations');
    return fullyCreatedAutomation;

  } catch (error: any) {
    console.error("Error during automation instance creation:", error);

    // Cleanup Attempt
    if (newAutomationId && triggerService && triggerSetupResult && connection) {
      console.warn(`Attempting cleanup for automation ${newAutomationId} due to creation error.`);
      await triggerService.cleanup({
          automationId: newAutomationId,
          userId: user.id,
          connection: connection, // Provide connection if available
          triggerConfig: triggerSetupResult, // Use the result from setup for cleanup info
      }).catch(cleanupError => {
          console.error(`Failed trigger cleanup during error handling for automation ${newAutomationId}:`, cleanupError);
      });
    }

    // Delete the partially created automation record if it exists
    if (newAutomationId) {
      await prisma.automation.delete({ where: { id: newAutomationId } }).catch(dbError => {
          console.error(`Failed to delete automation record ${newAutomationId} during cleanup:`, dbError);
      });
    }

    throw new Error(`Failed to create automation: ${error.message}`);
  }
}

// --- Keep other actions (update, delete, bulkDelete) ---
// Update deleteAutomation to use the service registry for cleanup
export async function deleteAutomation(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  let automation = null;
  let triggerService = null;
  let cleanupResult: TriggerCleanupResult | null = null;

  try {
    automation = await prisma.automation.findFirst({
      where: { id, userId: user.id },
      include: { connection: true } // Include connection for cleanup service
    });

    if (!automation) throw new Error("Automation not found");

    // --- Trigger Cleanup Logic ---
    const triggerConfig = automation.triggerConfig;
    const template = getAutomationTemplateById(automation.templateDefinitionId);

    if (template && template.trigger.platform && triggerConfig && typeof triggerConfig === 'object') {
      const appTriggerType = (triggerConfig as any).type as AppTriggerType; // Get specific type from stored config
      triggerService = getTriggerSetupService(template.trigger.platform, appTriggerType);

      if (triggerService) {
         console.log(`Using Trigger Service: ${triggerService.constructor.name} for cleanup`);
         cleanupResult = await triggerService.cleanup({
             automationId: automation.id,
             userId: user.id,
             connection: automation.connection, // Pass connection if it exists
             triggerConfig: triggerConfig,
         });
         if (!cleanupResult.success) {
             // Log the warning but proceed with DB deletion
             console.warn(`Trigger cleanup failed for automation ${id}: ${cleanupResult.message}`);
         } else {
              console.log(`Trigger cleanup successful for automation ${id}`);
         }
      } else {
          console.log(`No trigger cleanup service found for automation ${id}.`);
      }
    }
    // --- End Trigger Cleanup ---

    // Delete Automation from DB regardless of cleanup result
    await prisma.automation.delete({ where: { id } });

    revalidatePath('/automations');
    return { success: true };

  } catch (error: any) {
    console.error(`Error deleting automation ${id}:`, error);
    // Note: If DB deletion fails after successful cleanup, the external resource might be orphaned.
    // More robust systems might use a state machine or queue for deletion.
    throw error;
  }
}

// Update bulkDeleteAutomations to use the service registry for cleanup (Iterative approach)
export async function bulkDeleteAutomations(ids: string[]) {
   const user = await getCurrentUser();
   if (!user) throw new Error("Unauthorized");

   console.warn("Bulk deleting automations - iterating to perform trigger cleanup...");
   let deletedCount = 0;
   const errors: { id: string, error: string }[] = [];

   for (const id of ids) {
     try {
       // Reuse the single deleteAutomation function which now includes cleanup
       await deleteAutomation(id);
       deletedCount++;
     } catch (error: any) {
       console.error(`Failed to delete automation ${id} during bulk operation: ${error.message}`);
       errors.push({ id, error: error.message });
     }
   }

   revalidatePath('/automations');
   if (errors.length > 0) {
       console.error("Errors occurred during bulk deletion:", errors);
       throw new Error(`Failed to delete ${errors.length} out of ${ids.length} automations. Some external resources might remain. Check logs.`);
   }
   return { success: true, count: deletedCount };
 }

// Update Automation - Refactor needed here as well to handle potential trigger changes via services
export async function updateAutomation({ id, ...data }: any /* UpdateAutomationInput */) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  try {
    const existingAutomation = await prisma.automation.findFirst({
      where: { id, userId: user.id },
      include: { connection: true }
    });
    if (!existingAutomation) throw new Error("Automation not found");

    const existingTemplate = getAutomationTemplateById(existingAutomation.templateDefinitionId);
    if (!existingTemplate) throw new Error("Existing template definition not found.");

    let connection = existingAutomation.connection;
    let needsTriggerUpdate = false;
    let newTriggerService: TriggerSetupService | undefined = undefined;
    let oldTriggerService: TriggerSetupService | undefined = undefined;
    let newAppTriggerType = (data.triggerConfig?.type as AppTriggerType) ?? (existingAutomation.triggerConfig as any)?.type;

    // Determine if connection or trigger type changes require service interaction
    if (data.connectionId && data.connectionId !== existingAutomation.connectionId) {
        needsTriggerUpdate = true;
        connection = await prisma.connection.findFirst({ where: { id: data.connectionId, userId: user.id } });
        if (!connection) throw new Error("New connection not found or access denied.");
        // Ensure new connection platform is compatible (assuming template doesn't change)
        if (existingTemplate.trigger.platform && connection.platform !== existingTemplate.trigger.platform) {
             throw new Error(`Cannot change connection to a different platform (${connection.platform}) for this automation template (${existingTemplate.trigger.platform}).`);
        }
    }
    if (data.triggerConfig?.type && data.triggerConfig.type !== (existingAutomation.triggerConfig as any)?.type) {
         needsTriggerUpdate = true;
         newAppTriggerType = data.triggerConfig.type;
    }

    let finalTriggerConfig = data.triggerConfig ? { ...(existingAutomation.triggerConfig as object), ...data.triggerConfig } : existingAutomation.triggerConfig;
    let triggerSetupResult: TriggerSetupResult | null = null;


    if (needsTriggerUpdate && existingTemplate.trigger.platform) {
         console.log(`Trigger update needed for automation ${id}`);
         const oldAppTriggerType = (existingAutomation.triggerConfig as any)?.type as AppTriggerType;
         oldTriggerService = getTriggerSetupService(existingTemplate.trigger.platform, oldAppTriggerType);
         newTriggerService = getTriggerSetupService(existingTemplate.trigger.platform, newAppTriggerType);

         // 1. Cleanup old trigger (if service exists)
         if (oldTriggerService) {
             console.log("Cleaning up old trigger...");
             await oldTriggerService.cleanup({
                 automationId: id,
                 userId: user.id,
                 connection: existingAutomation.connection,
                 triggerConfig: existingAutomation.triggerConfig
             });
             // Remove old external info from config being saved
             const { externalWebhookId, webhookUrl, ...restConfig } = finalTriggerConfig as any;
             finalTriggerConfig = restConfig;
         }

         // 2. Setup new trigger (if service exists and we have a valid connection)
         if (newTriggerService && connection) {
              console.log("Setting up new trigger...");
              const webhookUrlBase = `${env.WEBHOOKS_URL}/api/webhooks/generic`;
              triggerSetupResult = await newTriggerService.setup({
                  automationId: id,
                  userId: user.id,
                  connection: connection,
                  triggerType: newAppTriggerType,
                  webhookUrlBase: webhookUrlBase,
              });
              finalTriggerConfig = { ...finalTriggerConfig as object, ...triggerSetupResult };
         } else if(newTriggerService && !connection) {
             console.warn("New trigger requires a connection, but none provided/found.");
         }
    }


    // Validate new config if provided
    let validatedConfig = existingAutomation.config;
    if (data.config) {
      const validationResult = existingTemplate.configSchema.safeParse(data.config);
      if (!validationResult.success) throw new Error("New configuration validation failed.");
      validatedConfig = validationResult.data;
    }

    // Prepare final update data
    const updateData = {
      name: data.name ?? existingAutomation.name,
      description: data.description ?? existingAutomation.description,
      config: validatedConfig as Prisma.JsonObject,
      connectionId: data.connectionId ?? existingAutomation.connectionId,
      deviceId: data.deviceId ?? existingAutomation.deviceId,
      templateId: data.templateId ?? existingAutomation.templateId,
      trigger: data.trigger ?? existingAutomation.trigger, // Note: Changing trigger type might be complex
      triggerConfig: finalTriggerConfig as Prisma.JsonObject,
      isActive: data.isActive ?? existingAutomation.isActive,
      metadata: data.metadata ? { ...(existingAutomation.metadata as object), ...data.metadata } : existingAutomation.metadata,
    };

    const updatedAutomation = await prisma.automation.update({
      where: { id },
      data: updateData,
    });

    revalidatePath('/automations');
    return updatedAutomation;

  } catch (error: any) {
     console.error(`Error updating automation ${id}:`, error);
     // Add potential rollback logic here if needed (e.g., if new setup failed after old cleanup)
     throw error;
  }
}
