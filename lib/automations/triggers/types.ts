// /whatsappier/lib/automations/triggers/types.ts
// NOTE: This file is NEW
import { AppTriggerType } from '@/types/automations-templates';
import { Platform, Connection, Prisma } from '@prisma/client';

// Result from setting up an external trigger
export interface TriggerSetupResult {
  externalWebhookId?: string; // ID from the external platform
  webhookUrl?: string;        // The final URL registered
  // Add other platform-specific data needed in triggerConfig
  [key: string]: any;
}

// Result from cleaning up an external trigger
export interface TriggerCleanupResult {
  success: boolean;
  message?: string;
}

// Interface for services that handle trigger setup/teardown for specific platforms
export interface TriggerSetupService {
  // Checks if this service can handle the given combination
  canHandle(platform: Platform, triggerType: AppTriggerType): boolean;

  // Performs the setup (e.g., create webhook)
  setup(params: {
    automationId: string;
    userId: string;
    connection: Connection; // Pass the full connection object
    triggerType: AppTriggerType; // The specific app trigger type
    webhookUrlBase: string; // e.g., https://yourapp.com/api/webhooks/generic
  }): Promise<TriggerSetupResult>;

  // Performs the cleanup (e.g., delete webhook)
  cleanup(params: {
    automationId: string;
    userId: string;
    connection?: Connection | null; // Connection might be missing if deleted first
    triggerConfig: Prisma.JsonValue; // The stored triggerConfig containing external IDs etc.
  }): Promise<TriggerCleanupResult>;
}
