
import { AutomationTemplateDefinition } from '@/types/automations-templates';
import { lfOrderToWhatsappTemplate } from './definitions/lf-order-to-whatsapp';
import { lfOtpVerificationTemplate } from './definitions/lf-otp-verification';
import { lfAbandonedCheckoutRecoveryTemplate } from './definitions/lf-abandoned-checkout-recovery';
import { gsheetsOrderSyncTemplate } from './definitions/lf-sheet-order-sync';

export const automationTemplateRegistry = new Map<string, AutomationTemplateDefinition<any>>();

// Register templates
automationTemplateRegistry.set(lfOrderToWhatsappTemplate.id, lfOrderToWhatsappTemplate);
automationTemplateRegistry.set(lfOtpVerificationTemplate.id, lfOtpVerificationTemplate);
automationTemplateRegistry.set(lfAbandonedCheckoutRecoveryTemplate.id, lfAbandonedCheckoutRecoveryTemplate);
automationTemplateRegistry.set(gsheetsOrderSyncTemplate.id, gsheetsOrderSyncTemplate);

// Function to get all templates (e.g., for display)
export const getAvailableAutomationTemplates = (): AutomationTemplateDefinition<any>[] => {
  return Array.from(automationTemplateRegistry.values());
};

// Function to get a specific template definition by ID
export const getAutomationTemplateById = (id: string): AutomationTemplateDefinition<any> | undefined => {
  return automationTemplateRegistry.get(id);
};;
