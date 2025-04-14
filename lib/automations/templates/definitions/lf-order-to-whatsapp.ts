import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { MessageSquare, ShoppingCart } from 'lucide-react'; // Example icons
import { LfOrderToWhatsappForm } from '@/components/pages/automations/config-forms/LfOrderToWhatsappForm';
import { AppActionType, AppTriggerType, AutomationTemplateDefinition } from '@/types/automations-templates';

// Define the Zod schema for this template's configuration
export const LfOrderToWhatsappConfigSchema = z.object({
  lightfunnelsConnectionId: z.string().min(1, { message: "Lightfunnels connection is required." }),
  funnelId: z.string().min(1, { message: "Funnel ID is required." }), // Example: Assuming you need a specific funnel
  whatsappDeviceId: z.string().min(1, { message: "WhatsApp device is required." }),
  messageTemplateId: z.string().min(1, { message: "Message template is required." }),
});

// Define the template
export const lfOrderToWhatsappTemplate: AutomationTemplateDefinition<typeof LfOrderToWhatsappConfigSchema> = {
  id: 'lf-order-to-whatsapp',
  name: 'Send WhatsApp on Lightfunnels Order',
  description: 'Automatically send a WhatsApp message when a new order is confirmed in a specific Lightfunnels funnel.',
  icon: ShoppingCart, // Or a custom component/SVG
  category: 'E-commerce',

  awaitsReply: true,
  trigger: {
    type: AppTriggerType.LIGHTFUNNELS_ORDER_CONFIRMED,
    platform: Platform.LIGHTFUNNELS,
    prismaTriggerType: PrismaTriggerType.WEBHOOK,
  },

  action: {
    type: AppActionType.SEND_WHATSAPP_MESSAGE,
    // Platform is implicit (it's WhatsApp via a selected Device)
  },

  configSchema: LfOrderToWhatsappConfigSchema,

  ConfigFormComponent: LfOrderToWhatsappForm,

  executionLogicIdentifier: 'executeLfOrderToWhatsapp', // String identifier for backend lookup

  requiredResources: {
      connections: [Platform.LIGHTFUNNELS],
      devices: true,
      templates: true,
  }
};
