import { Automation, Prisma, RunStatus } from '@prisma/client';
import { WhatsAppService } from '../helpers/whatsapp'; // Adjust path
import { prisma } from '@/lib/db';
import {
    LightfunnelsWebhookEventPayload,
    LightfunnelsOrderConfirmedNode
} from '../helpers/lightfunnels'; // Adjust path
import { z } from 'zod';
import { LfOrderToWhatsappConfigSchema } from '../templates/definitions/lf-order-to-whatsapp'; // Adjust path
import { processPhoneNumber } from '../helpers/utils';

type Config = z.infer<typeof LfOrderToWhatsappConfigSchema>;

export async function executeLfOrderToWhatsapp(
    automation: Automation,
    triggerPayload: LightfunnelsWebhookEventPayload,
    config: Config,
    runId: string
): Promise<void> {

    // --- Type Guard and Extraction ---
    if (!triggerPayload.node || typeof triggerPayload.node !== 'object') {
        console.error(`[Execution Error] Automation ${automation.id}: Missing or invalid 'node' object in trigger payload. Payload:`, JSON.stringify(triggerPayload));
        throw new Error("Invalid trigger payload structure: 'node' object missing or invalid.");
    }
    const orderData = triggerPayload.node as LightfunnelsOrderConfirmedNode;

    if (typeof orderData.id !== 'string' || typeof orderData.total !== 'number' || typeof orderData.email !== 'string' || typeof orderData.phone !== 'string') {
         console.error(`[Execution Error] Automation ${automation.id}: Payload 'node' object missing critical fields for Order Confirmed. Data:`, JSON.stringify(orderData));
        throw new Error("Payload structure mismatch: Missing critical Order Confirmed fields.");
    }
    // --- End Type Guard ---

    console.log(`Executing lf-order-to-whatsapp for automation ${automation.id}, order ID ${orderData.id}`);

    // 1. Extract necessary info from config and the correctly typed 'orderData'
    const { whatsappDeviceId, messageTemplateId } = config;
    const customerName = orderData.customer?.full_name || orderData.shipping_address?.first_name || "Customer";
    const orderNumber = orderData.name;
    const totalAmount = `${orderData.total} ${orderData.currency || 'USD'}`;

    // --- Process Phone Number ---
    const shippingCountry = orderData.shipping_address?.country;
    const billingCountry = orderData.billing_address?.country;
    const processedPhone = processPhoneNumber(orderData.phone, shippingCountry, billingCountry);

    if (!processedPhone.isValid || !processedPhone.phoneNumber) {
        console.error(`[Execution Error] Automation ${automation.id}: Invalid phone number found in payload: ${orderData.phone}. Used Shipping Country: ${shippingCountry}, Billing Country: ${billingCountry}`);
        throw new Error("Customer phone number is invalid or could not be formatted correctly.");
    }
    const customerPhone = processedPhone.phoneNumber; // Use the validated and formatted number
    console.log(`Processed phone number: ${orderData.phone} -> ${customerPhone} (Used country: ${processedPhone.usedCountry})`);
    // --- End Phone Processing ---


    // 2. Validate required *internal* data (IDs from config)
    if (!whatsappDeviceId) {
        throw new Error(`[Config Error] Automation ${automation.id}: WhatsApp Device ID is missing in automation config.`);
    }
    if (!messageTemplateId) {
        throw new Error(`[Config Error] Automation ${automation.id}: Message Template ID is missing in automation config.`);
    }

    // 3. Fetch required resources (Device, Message Template)
    const device = await prisma.device.findUnique({ where: { id: whatsappDeviceId } });
    if (!device) {
         throw new Error(`[Resource Error] Automation ${automation.id}: WhatsApp device ${whatsappDeviceId} not found.`);
    }
    if (device.status !== 'CONNECTED') {
        throw new Error(`[Resource Error] Automation ${automation.id}: WhatsApp device ${whatsappDeviceId} is not connected (status: ${device.status}).`);
    }

    const messageTemplate = await prisma.template.findUnique({ where: { id: messageTemplateId } });
    if (!messageTemplate) {
        throw new Error(`[Resource Error] Automation ${automation.id}: Message template ${messageTemplateId} not found.`);
    }

    // 4. Prepare variables for the message template
    const templateVariables: Record<string, string> = {
        customer_name: customerName,
        order_number: orderNumber,
        total_amount: totalAmount,
        // Add other variables based on LightfunnelsOrderConfirmedNode type
    };

    // 5. Initialize WhatsApp Service
    const whatsappService = WhatsAppService.fromDevice(device);

    // 6. Send the message using the template content
    console.log(`Sending WhatsApp message to ${customerPhone} using template ${messageTemplate.name} for automation ${automation.id}`);
    let sentMessageId: string | undefined;
    try {
        const sendResult = await whatsappService.sendTemplate(
            customerPhone, // Use the processed phone number
            messageTemplate.content,
            templateVariables
        );
        sentMessageId = sendResult?.key?.id; // Capture the sent message ID

        // --- 7. Update Run Status to WAITING_REPLY ---
        await prisma.run.update({
            where: { id: runId },
            data: {
                status: RunStatus.WAITING_REPLY, // Set the new status
                phoneNumber: customerPhone,
            }
        });
        console.log(`WhatsApp message sent for automation ${automation.id}, result status: ${sendResult.status}, ID: ${sendResult?.key?.id}`);
    } catch (whatsappError: any) {
         console.error(`[WhatsApp Error] Automation ${automation.id}: Failed to send message to ${customerPhone}. Error:`, whatsappError);
         throw new Error(`Failed to send WhatsApp message: ${whatsappError.message}`);
    }

    console.log(`Finished execution for lf-order-to-whatsapp, automation ${automation.id}.`);
}
