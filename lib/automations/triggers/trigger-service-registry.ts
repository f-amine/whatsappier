import { Platform } from '@prisma/client';
import { TriggerSetupService } from './types';
import { LightfunnelsTriggerService } from './lightfunnels-trigger-service';
import { AppTriggerType } from '@/types/automations-templates';
// Import other service implementations here
// import { ShopifyTriggerService } from './shopify-trigger-service';

// Array holding instances of all available trigger setup services
export const triggerSetupServices: TriggerSetupService[] = [
    new LightfunnelsTriggerService(),
    // new ShopifyTriggerService(),
    // Add other services as you implement them
];

/**
 * Finds the appropriate trigger setup service for a given platform and trigger type.
 * @param platform - The platform originating the trigger.
 * @param triggerType - The specific application trigger type.
 * @returns The matching service instance, or undefined if none is found.
 */
export function getTriggerSetupService(platform: Platform, triggerType: AppTriggerType): TriggerSetupService | undefined {
  return triggerSetupServices.find(service => service.canHandle(platform, triggerType));
}
