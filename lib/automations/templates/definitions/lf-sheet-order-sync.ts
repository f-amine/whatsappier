import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { FileSpreadsheet } from 'lucide-react';
import { AppActionType, AppTriggerType, AutomationTemplateDefinition } from '@/types/automations-templates';
import { ORDER_SHEET_COLUMNS, convertColumnsToFormValues } from '@/lib/automations/helpers/sheets-columns';
import { GsheetsOrderSyncForm } from '@/components/pages/automations/config-forms/LfOrderSheetSyncForm';

export const GsheetsOrderSyncConfigSchema = z.object({
  lightfunnelsConnectionId: z.string().min(1, { message: "Lightfunnels connection is required." }),
  googleSheetsConnectionId: z.string().min(1, { message: "Google Sheets connection is required." }),
  
  // Source settings
  syncSource: z.enum(['all_sources', 'specific_funnel', 'specific_store']).default('all_sources'),
  funnelId: z.string().optional(),
  storeId: z.string().optional(),
  
  // Filters
  productFilter: z.enum(['all_products', 'specific_product']).default('all_products'),
  productId: z.string().optional(),
  
  // Google Sheets settings
  googleSheetId: z.string().min(1, { message: "Google Sheet is required." }),
  worksheetName: z.string().min(1, { message: "Worksheet name is required." }).default('Sheet1'),
  createNewSheet: z.boolean().default(false),
  customSheetName: z.string().optional(),
  
  // Column mapping
  sheetColumns: z.array(z.object({
    field: z.string(),
    enabled: z.boolean().default(true),
    category: z.string().optional()
  })).default(convertColumnsToFormValues(ORDER_SHEET_COLUMNS)),
  
  // Sync settings
  syncMode: z.enum(['append_only', 'update_existing']).default('append_only'),
  uniqueIdentifierField: z.string().default('orderId'),
});

export const gsheetsOrderSyncTemplate: AutomationTemplateDefinition<typeof GsheetsOrderSyncConfigSchema> = {
  id: 'gsheets-order-sync',
  name: 'Google Sheets Order Sync',
  description: 'Automatically sync confirmed orders from Lightfunnels to a Google Sheets spreadsheet with customizable field mapping.',
  icon: FileSpreadsheet,
  category: 'Data Sync',

  awaitsReply: false,
  
  trigger: {
    type: AppTriggerType.LIGHTFUNNELS_ORDER_CONFIRMED,
    platform: Platform.LIGHTFUNNELS,
    prismaTriggerType: PrismaTriggerType.WEBHOOK,
  },

  action: {
    type: AppActionType.SYNC_TO_GOOGLE_SHEETS,
  },

  configSchema: GsheetsOrderSyncConfigSchema,

  ConfigFormComponent: GsheetsOrderSyncForm,

  executionLogicIdentifier: 'executeGsheetsOrderSync',
  replyHandlerIdentifier: '',

  defaultConfig: {
    syncSource: 'all_sources',
    productFilter: 'all_products',
    worksheetName: 'Sheet1',
    syncMode: 'append_only',
    uniqueIdentifierField: 'orderId',
    sheetColumns: convertColumnsToFormValues(ORDER_SHEET_COLUMNS),
  },

  requiredResources: {
    connections: [Platform.LIGHTFUNNELS, Platform.GOOGLE_SHEETS],
  },
};
