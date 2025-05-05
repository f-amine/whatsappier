import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { ShoppingCart, RotateCcw } from 'lucide-react';
import { AppActionType, AppTriggerType, AutomationTemplateDefinition } from '@/types/automations-templates';
import { LfAbandonedCheckoutRecoveryForm } from '@/components/pages/automations/config-forms/LfAbandonedCheckoutRecoveryForm';

// Define the configuration schema
export const LfAbandonedCheckoutRecoveryConfigSchema = z.object({
  lightfunnelsConnectionId: z.string().min(1, { message: "Lightfunnels connection is required." }),
  whatsappDeviceId: z.string().min(1, { message: "WhatsApp device is required." }),
  messageTemplateId: z.string().min(1, { message: "Message template is required." }),
  delayMinutes: z.number().int().min(5, "Delay must be at least 5 minutes").max(1440, "Delay cannot exceed 24 hours (1440 minutes)").default(20)
    .describe("Wait time in minutes after checkout creation before sending recovery message."),
});

export const lfAbandonedCheckoutRecoveryTemplate: AutomationTemplateDefinition<typeof LfAbandonedCheckoutRecoveryConfigSchema> = {
  id: 'lf-abandoned-checkout-recovery',
  name: 'Lightfunnels Abandoned Checkout Recovery',
  description: 'Send a WhatsApp message with a recovery link after a checkout is abandoned for a set time.',
  icon: RotateCcw,
  category: 'E-commerce',

  awaitsReply: false, 

  trigger: {
    type: AppTriggerType.LIGHTFUNNELS_CHECKOUT_CREATED, 
    platform: Platform.LIGHTFUNNELS,
    prismaTriggerType: PrismaTriggerType.WEBHOOK,
  },

  action: {
    type: AppActionType.SEND_WHATSAPP_MESSAGE,
  },

  configSchema: LfAbandonedCheckoutRecoveryConfigSchema,

  ConfigFormComponent: LfAbandonedCheckoutRecoveryForm, 

  executionLogicIdentifier: 'executeLfAbandonedCheckoutRecovery',
  replyHandlerIdentifier: '',

  defaultConfig: {
    delayMinutes: 20,
  },

  requiredResources: {
    connections: [Platform.LIGHTFUNNELS], 
    devices: true,
    templates: true, 
  },
};
