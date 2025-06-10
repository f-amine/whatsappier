import { Platform, Connection, Prisma } from '@prisma/client';
import { LightFunnelsService, WebhookType, WebhookVersion } from '../helpers/lightfunnels'; // Your LF API helper
import { TriggerSetupService, TriggerSetupResult, TriggerCleanupResult } from './types';
import { AppTriggerType } from '@/types/automations-templates';

export class LightfunnelsTriggerService implements TriggerSetupService {

  canHandle(platform: Platform, triggerType: AppTriggerType): boolean {
    return platform === Platform.LIGHTFUNNELS &&
           (triggerType === AppTriggerType.LIGHTFUNNELS_ORDER_CONFIRMED ||
            triggerType === AppTriggerType.LIGHTFUNNELS_CHECKOUT_CREATED||
            triggerType === AppTriggerType.LIGHTFUNNELS_ORDER_FULFILLED); 
  }

  async setup(params: {
    automationId: string;
    userId: string;
    connection: Connection;
    triggerType: AppTriggerType;
    webhookUrlBase: string; 
  }): Promise<TriggerSetupResult> {
    console.log(`[LightfunnelsTriggerService] Setting up trigger for automation ${params.automationId}`);

    const { automationId, connection, triggerType, webhookUrlBase } = params;

    // 1. Get Credentials
    const { accessToken } = connection.credentials as { accessToken: string };
    if (!accessToken) {
      throw new Error("Lightfunnels access token missing in connection credentials.");
    }
    const lfService = new LightFunnelsService(accessToken);

    // 2. Map AppTriggerType to Lightfunnels WebhookType
    let lfWebhookType: WebhookType;
    switch (triggerType) {
      case AppTriggerType.LIGHTFUNNELS_ORDER_CONFIRMED:
        lfWebhookType = WebhookType.ORDER_CONFIRMED;
        break;
      case AppTriggerType.LIGHTFUNNELS_ORDER_FULFILLED:
        lfWebhookType = WebhookType.ORDER_FULFILLED;
        break;
      case AppTriggerType.LIGHTFUNNELS_CHECKOUT_CREATED:
        lfWebhookType = WebhookType.CHECKOUT_CREATED
      
      // Add mappings for other LF triggers you support
      default:
        throw new Error(`Unsupported Lightfunnels trigger type for setup: ${triggerType}`);
    }

    // 3. Construct the specific webhook URL
    const webhookUrl = `${webhookUrlBase}/${automationId}`;
    console.log(`[LightfunnelsTriggerService] Registering webhook URL: ${webhookUrl} for type ${lfWebhookType}`);

    try {
      const createdWebhook = await lfService.createWebhook({
        type: lfWebhookType,
        url: webhookUrl,
        version: WebhookVersion.V2,
        settings: {}
      });
      console.log(`[LightfunnelsTriggerService] Webhook created: ID=${createdWebhook.id}`);

      return {
        externalWebhookId: createdWebhook.id,
        webhookUrl: webhookUrl, 
        lfWebhookType: lfWebhookType 
      };
    } catch (error: any) {
      console.error(`[LightfunnelsTriggerService] Failed to create webhook for automation ${automationId}:`, error);
      // Improve error message parsing if possible
      throw new Error(`Failed to create Lightfunnels webhook: ${error.message || 'Unknown API error'}`);
    }
  }

  async cleanup(params: {
    automationId: string;
    userId: string; // Added userId
    connection?: Connection | null;
    triggerConfig: Prisma.JsonValue;
  }): Promise<TriggerCleanupResult> {
    console.log(`[LightfunnelsTriggerService] Cleaning up trigger for automation ${params.automationId}`);
    const { automationId, connection, triggerConfig } = params;
    const config = triggerConfig as any; // Cast for easier access
    const externalWebhookId = config?.externalWebhookId;

    if (!externalWebhookId) {
      console.warn(`[LightfunnelsTriggerService] No externalWebhookId found in triggerConfig for automation ${automationId}. Skipping cleanup.`);
      return { success: true, message: "No external webhook ID found to delete." };
    }

    if (!connection || connection.platform !== Platform.LIGHTFUNNELS) {
      console.warn(`[LightfunnelsTriggerService] Connection missing or not Lightfunnels for automation ${automationId}. Cannot delete webhook ${externalWebhookId}.`);
      return { success: false, message: "Connection details missing or invalid." };
    }

    const { accessToken } = connection.credentials as { accessToken: string };
    if (!accessToken) {
        console.warn(`[LightfunnelsTriggerService] Access token missing for connection ${connection.id}. Cannot delete webhook ${externalWebhookId}.`);
        return { success: false, message: "Access token missing." };
    }
    const lfService = new LightFunnelsService(accessToken);
    console.log(`[LightfunnelsTriggerService] Deleting webhook ${externalWebhookId}`);
    await lfService.deleteWebhook(externalWebhookId);
    console.log(`[LightfunnelsTriggerService] Successfully deleted webhook ${externalWebhookId}`);
    return { success: true };
  }
}
