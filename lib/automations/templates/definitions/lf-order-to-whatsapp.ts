import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { MessageSquare, ShoppingCart } from 'lucide-react'; // Example icons
import { LfOrderToWhatsappForm } from '@/components/pages/automations/config-forms/LfOrderToWhatsappForm';
import { AppActionType, AppTriggerType, AutomationTemplateDefinition } from '@/types/automations-templates';

export const LfOrderToWhatsappConfigSchema = z.object({
  lightfunnelsConnectionId: z.string().min(1, { message: "Lightfunnels connection is required." }),
  funnelId: z.string().min(1, { message: "Funnel ID is required." }),
  whatsappDeviceId: z.string().min(1, { message: "WhatsApp device is required." }),
  messageTemplateId: z.string().min(1, { message: "Message template is required." }),
  requireConfirmation: z.boolean().default(true),
  syncToGoogleSheets: z.boolean().default(false),
  googleSheetsConnectionId: z.string().optional(),
  googleSheetId: z.string().optional(),
  createNewSheet: z.boolean().default(false),
  customSheetName: z.string().optional(),
  sheetColumns: z.array(z.object({
    field: z.string(),
    enabled: z.boolean().default(true)
  })).optional().default([
    { field: 'date', enabled: true },
    { field: 'orderNumber', enabled: true },
    { field: 'customerName', enabled: true },
    { field: 'customerEmail', enabled: true },
    { field: 'customerPhone', enabled: true },
    { field: 'totalAmount', enabled: true },
    { field: 'status', enabled: true },
    { field: 'replyText', enabled: true }
  ]),
});

// Define the template
export const lfOrderToWhatsappTemplate: AutomationTemplateDefinition<typeof LfOrderToWhatsappConfigSchema> = {
  id: 'lf-order-to-whatsapp',
  name: 'Send WhatsApp on Lightfunnels Order',
  description: 'Automatically send a WhatsApp message when a new order is confirmed in a specific Lightfunnels funnel.',
  icon: ShoppingCart,
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
  replyHandlerIdentifier: 'handleLfOrderReply',

  requiredResources: {
      connections: [Platform.LIGHTFUNNELS, Platform.GOOGLE_SHEETS],
      devices: true,
      templates: true,
  }
};
