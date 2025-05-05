// /whatsappier/lib/automations/execution/lf-otp-verification.ts
import { Automation, Prisma, RunStatus } from '@prisma/client'; // Import RunStatus
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { WhatsAppService } from '../helpers/whatsapp';
import { LfOtpVerificationConfigSchema } from '../templates/definitions/lf-otp-verification';
import { generateOTP } from '@/lib/utils';
import { addMinutes } from 'date-fns';

type Config = z.infer<typeof LfOtpVerificationConfigSchema>;

interface OtpRequestPayload {
  phone: string; 
  email?: string | null;
  isTest?: boolean;
  shippingCountry?: string | null;
  billingCountry?: string | null;
}


export async function executeLfOtpRequest(
  automation: Automation,
  requestPayload: OtpRequestPayload
): Promise<{ success: boolean; message?: string }> {

  console.log(`[LF OTP Request] Executing for automation ${automation.id}, phone: ${requestPayload.phone}`);
  let runId: string | null = null; 
  let whatsappSendResult: any = null; 

  try {
    const configValidation = LfOtpVerificationConfigSchema.safeParse(automation.config);
    if (!configValidation.success) {
      console.error(`[Config Error] Automation ${automation.id}: Invalid config.`, configValidation.error);
      throw new Error("Automation configuration is invalid.");
    }
    const config = configValidation.data;

    if (!config.whatsappDeviceId || !config.messageTemplate) {
      throw new Error("Missing required configuration: WhatsApp Device ID or Message Template.");
    }

    const device = await prisma.device.findUnique({ where: { id: config.whatsappDeviceId } });
    if (!device) {
      throw new Error(`WhatsApp device ${config.whatsappDeviceId} not found.`);
    }
    if (device.status !== 'CONNECTED') {
      throw new Error(`WhatsApp device ${config.whatsappDeviceId} is not connected.`);
    }

    const targetPhoneNumber = requestPayload.phone;

    const otpLength = config.otpLength && config.otpLength >= 4 && config.otpLength <= 8 ? config.otpLength : 6;
    const otpExpiryMinutes = config.otpExpiryMinutes && config.otpExpiryMinutes >= 1 && config.otpExpiryMinutes <= 60 ? config.otpExpiryMinutes : 10;
    const otp = generateOTP(otpLength);
    const expiresAt = addMinutes(new Date(), otpExpiryMinutes);

    await prisma.oTP.create({
      data: {
        userId: automation.userId,
        code: otp,
        phoneNumber: targetPhoneNumber,
        email: requestPayload.email || null,
        expiresAt: expiresAt,
        type: requestPayload.isTest ? 'TEST_LF_OTP' : 'LIGHTFUNNELS_CHECKOUT_OTP',
      },
    });
    console.log(`[LF OTP Request] Stored OTP for ${targetPhoneNumber}, User: ${automation.userId}`);

    const whatsappService = WhatsAppService.fromDevice(device);
    const messageToSend = config.messageTemplate.replace('{{otp}}', otp);

    whatsappSendResult = await whatsappService.sendText({
      number: targetPhoneNumber,
      text: messageToSend
    });
    console.log(`[LF OTP Request] Sent OTP message via WhatsApp to ${targetPhoneNumber} for automation ${automation.id}`);

    const runMetadata: Prisma.JsonObject = {
        otpSentTo: targetPhoneNumber,
        email: requestPayload.email,
        isTest: requestPayload.isTest,
        messageTemplateUsed: config.messageTemplate,
        whatsappMessageId: whatsappSendResult?.key?.id, 
        status: whatsappSendResult?.status 
    };

    await prisma.run.create({
        data: {
            automationId: automation.id,
            userId: automation.userId,
            status: RunStatus.SUCCEEDED,
            triggerPayload: JSON.stringify(requestPayload) as unknown as Prisma.JsonValue,
            startedAt: new Date(),
            finishedAt: new Date(),
            phoneNumber: targetPhoneNumber,
            metadata: runMetadata
        }
    });
    console.log(`[LF OTP Request] Successfully created SUCCEEDED Run record for automation ${automation.id}`);
    return { success: true };

  } catch (error: any) {
    console.error(`[LF OTP Request Error] Automation ${automation.id}:`, error.message);

    try {
      await prisma.run.create({
        data: {
          automationId: automation.id,
          userId: automation.userId,
          status: RunStatus.FAILED,
          triggerPayload: JSON.stringify(requestPayload) as unknown as Prisma.JsonValue,
          startedAt: new Date(),
          finishedAt: new Date(),
          phoneNumber: requestPayload.phone,
          errorMessage: error.message || 'Unknown error during OTP request execution.',
          metadata: {
             errorSource: error.constructor.name,
             whatsappSendResult: whatsappSendResult
          } as Prisma.JsonObject,
        },
        select: { id: true } 
      }).then(failedRun => {
          runId = failedRun.id;
          console.log(`[LF OTP Request] Created FAILED Run record ${runId} for automation ${automation.id}`);
      });
    } catch (runCreateError: any) {
        console.error(`[LF OTP Request DB Error] CRITICAL: Failed to create even a FAILED Run record for automation ${automation.id}:`, runCreateError);
    }
    throw error;
  }
}
