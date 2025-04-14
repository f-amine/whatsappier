import { AutomationTemplateDefinition } from '@/types/automations-templates';
import { lfOrderToWhatsappTemplate } from './definitions/lf-order-to-whatsapp';
// Import other template definitions here

// Central registry for all automation templates
export const automationTemplateRegistry = new Map<string, AutomationTemplateDefinition<any>>();

// Register templates
automationTemplateRegistry.set(lfOrderToWhatsappTemplate.id, lfOrderToWhatsappTemplate);
// automationTemplateRegistry.set(anotherTemplate.id, anotherTemplate);

// Function to get all templates (e.g., for display)
export const getAvailableAutomationTemplates = (): AutomationTemplateDefinition<any>[] => {
  return Array.from(automationTemplateRegistry.values());
};

// Function to get a specific template definition by ID
export const getAutomationTemplateById = (id: string): AutomationTemplateDefinition<any> | undefined => {
  return automationTemplateRegistry.get(id);
};
