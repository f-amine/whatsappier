// /whatsappier/lib/automations/templates/definitions/lf-otp-verification.ts
import { z } from 'zod';
import { Platform, TriggerType as PrismaTriggerType } from '@prisma/client';
import { LockKeyhole } from 'lucide-react'; // Or another suitable icon
import { AppActionType, AppTriggerType, AutomationTemplateDefinition } from '@/types/automations-templates';
import { LfOtpVerificationForm } from '@/components/pages/automations/config-forms/LfOtpVerificationForm';

// Define the configuration schema (Removed defaultCountryCode)
export const LfOtpVerificationConfigSchema = z.object({
  whatsappDeviceId: z.string().min(1, { message: "WhatsApp device is required." }),
  messageTemplate: z.string().min(1, { message: "Message template is required." })
    .default('Your verification code is: {{otp}}. This code expires in 10 minutes.')
    .describe('Use {{otp}} as the placeholder for the code.'),
  otpLength: z.number().int().min(4).max(8).default(6).optional(),
  otpExpiryMinutes: z.number().int().min(1).max(60).default(10).optional(),
  // defaultCountryCode field removed
});

// Define the template
export const lfOtpVerificationTemplate: AutomationTemplateDefinition<typeof LfOtpVerificationConfigSchema> = {
  id: 'lf-otp-verification',
  name: 'Lightfunnels Checkout OTP',
  description: 'Verify customer phone numbers via WhatsApp OTP during Lightfunnels checkout.',
  icon: LockKeyhole,
  category: 'Verification',

  awaitsReply: false,

  trigger: {
    type: AppTriggerType.LIGHTFUNNELS_CHECKOUT_OTP,
    platform: Platform.LIGHTFUNNELS,
    prismaTriggerType: PrismaTriggerType.SCRIPT_TAG,
  },

  action: {
    type: AppActionType.SEND_WHATSAPP_OTP,
  },

  configSchema: LfOtpVerificationConfigSchema,

  ConfigFormComponent: LfOtpVerificationForm,

  executionLogicIdentifier: 'executeLfOtpRequest',
  replyHandlerIdentifier: '',

  defaultConfig: {
    messageTemplate: 'Your verification code is: {{otp}}. This code expires in 10 minutes.',
    otpLength: 6,
    otpExpiryMinutes: 10,
    // defaultCountryCode removed
  },

  requiredResources: {
    devices: true,
  },
};
