// /whatsappier/types/automation-templates.ts
import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { LucideIcon } from 'lucide-react';

// Define specific trigger types relevant to your app logic
export enum AppTriggerType {
  LIGHTFUNNELS_ORDER_CONFIRMED = 'lightfunnels_order_confirmed',
  LIGHTFUNNELS_ORDER_FULFILLED = 'lightfunnels_order_fulfilled',
  // Add other specific triggers like SHOPIFY_ORDER_CREATED, SCHEDULE_DAILY, etc.
}

// Define specific action types
export enum AppActionType {
  SEND_WHATSAPP_MESSAGE = 'send_whatsapp_message',
  ADD_GOOGLE_SHEET_ROW = 'add_google_sheet_row',
  // Add other actions
}

// Base interface for configuration schemas
export type ConfigSchema = z.ZodObject<any, any, any>;

// Interface defining an automation template
export interface AutomationTemplateDefinition<TConfig extends ConfigSchema = ConfigSchema> {
  id: string; // Unique identifier (e.g., 'lf-order-to-whatsapp')
  name: string; // User-friendly name
  description: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>; // Icon component
  category: string; // e.g., 'E-commerce', 'Messaging'
  
  awaitsReply?: boolean; 
  // Trigger details
  trigger: {
    type: AppTriggerType; // Specific trigger event type
    platform?: Platform; // Platform originating the trigger (if applicable)
    prismaTriggerType: PrismaTriggerType; // Mapping to Prisma enum (e.g., WEBHOOK)
  };

  // Action details
  action: {
    type: AppActionType; // Specific action type
    platform?: Platform; // Platform performing the action (if applicable)
  };

  // Configuration needed from the user
  configSchema: TConfig;
  
  // Component to render the config form
  ConfigFormComponent: React.ComponentType<{
    form: any; // react-hook-form instance
    templateDefinitionId: string;
  }>;

  // Function on the backend to execute this automation
  // This is conceptual - the actual execution will be linked via the id
  executionLogicIdentifier: string; // e.g., 'executeLfOrderToWhatsapp'

  // Optional: Pre-filled default config values
  defaultConfig?: Partial<z.infer<TConfig>>;

  // Optional: Define required connections/resources
  requiredResources?: {
    connections?: Platform[]; // e.g., [Platform.LIGHTFUNNELS]
    devices?: boolean; // Does it need a WhatsApp device?
    templates?: boolean; // Does it need a message template?
  };
}
