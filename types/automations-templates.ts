import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { LucideIcon } from 'lucide-react';

export enum AppTriggerType {
  LIGHTFUNNELS_ORDER_CONFIRMED = 'lightfunnels_order_confirmed',
  LIGHTFUNNELS_ORDER_FULFILLED = 'lightfunnels_order_fulfilled',
  LIGHTFUNNELS_CHECKOUT_OTP = 'lightfunnels_checkout_otp', 
  LIGHTFUNNELS_CHECKOUT_CREATED = 'lightfunnels_checkout_created',
}

// Define specific action types
export enum AppActionType {
  SEND_WHATSAPP_MESSAGE = 'send_whatsapp_message',
  ADD_GOOGLE_SHEET_ROW = 'add_google_sheet_row',
  SYNC_TO_GOOGLE_SHEETS = 'SYNC_TO_GOOGLE_SHEETS', 
  SEND_WHATSAPP_OTP = 'send_whatsapp_otp', 
}

export type ConfigSchema = z.ZodObject<any, any, any>;

export interface AutomationTemplateDefinition<TConfig extends ConfigSchema = ConfigSchema> {
  id: string; 
  name: string;
  description: string;
  icon: LucideIcon | React.ComponentType<{ className?: string }>; // Icon component
  category: string; 
  
  awaitsReply?: boolean; 
  trigger: {
    type: AppTriggerType; 
    platform?: Platform; 
    prismaTriggerType: PrismaTriggerType; 
  };

  action: {
    type: AppActionType; 
    platform?: Platform;
  };

  configSchema: TConfig;
  
  ConfigFormComponent: React.ComponentType<{
    form: any; 
    templateDefinitionId: string;
    automationId?: string | null;
  }>;

  executionLogicIdentifier: string; 
  replyHandlerIdentifier: string;

  defaultConfig?: Partial<z.infer<TConfig>>;

  requiredResources?: {
    connections?: Platform[]; 
    devices?: boolean; 
    templates?: boolean;
  };
}
