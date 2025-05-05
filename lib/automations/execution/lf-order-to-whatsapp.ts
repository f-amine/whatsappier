import { Automation, Prisma, RunStatus } from '@prisma/client';
import { WhatsAppService } from '../helpers/whatsapp';
import { prisma } from '@/lib/db';
import {
    LightfunnelsWebhookEventPayload,
    LightfunnelsOrderConfirmedNode,
    LightFunnelsService,
    UpdateOrderInput
} from '../helpers/lightfunnels';
import { z } from 'zod';
import { LfOrderToWhatsappConfigSchema } from '../templates/definitions/lf-order-to-whatsapp';
import { processPhoneNumber } from '../helpers/utils';
import { GeminiService, ReplyClassification } from '../helpers/ai-service';
import { OrderTags } from '../helpers/consts';
import { GoogleSheetsService } from '../helpers/google-sheets';

type Config = z.infer<typeof LfOrderToWhatsappConfigSchema>;

export async function executeLfOrderToWhatsapp(
    automation: Automation,
    triggerPayload: LightfunnelsWebhookEventPayload,
    config: Config,
    runId: string
): Promise<void> {

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
   
    const configFunnelId = (config as { funnelId: string }).funnelId;
    if (orderData.funnel_id !== configFunnelId) {
        console.log(`[Skip] Automation ${automation.id}: Order funnel ID ${orderData.funnel_id} does not match configured funnel ID ${configFunnelId}`);
        return; 
    }

    console.log(`Executing lf-order-to-whatsapp for automation ${automation.id}, order ID ${orderData.id}`);

    // 1. Extract necessary info from config and the correctly typed 'orderData'
    const { whatsappDeviceId, messageTemplateId, requireConfirmation = true, syncToGoogleSheets = false } = config;
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
    try {
        const sendResult = await whatsappService.sendTemplate(
            customerPhone, // Use the processed phone number
            messageTemplate.content,
            templateVariables
        );

        // 7. Update Run Status based on requireConfirmation setting
        const runStatus = requireConfirmation ? RunStatus.WAITING_REPLY : RunStatus.SUCCEEDED;
        const metadata: Prisma.JsonObject = { 
            sentMessageContent: messageTemplate.content,
            requireConfirmation,
            syncToGoogleSheets
        };
        
        // If no confirmation required, auto-tag the order as confirmed in Lightfunnels
        if (!requireConfirmation) {
            try {
                const credentials = automation.connectionId ? await prisma.connection.findUnique({
                    select: { credentials: true },
                    where: { id: automation.connectionId }
                }) : null;

                if (credentials?.credentials["accessToken"]) {
                    const lfService = new LightFunnelsService(credentials.credentials["accessToken"] as string);
                    await lfService.updateOrder(orderData.id, { 
                        tags: [OrderTags.CONFIRMED]
                    });
                    metadata.autoConfirmed = true;
                    
                    // If Google Sheets integration is enabled and no confirmation is required, update sheet immediately
                    if (syncToGoogleSheets && config.googleSheetsConnectionId && (config.googleSheetId || config.createNewSheet)) {
                        await updateGoogleSheet(
                            config.googleSheetsConnectionId,
                            config.googleSheetId || '',
                            {
                                // Basic order info
                                orderNumber,
                                orderId: orderData.id,
                                internalId: orderData._id,
                                createdAt: orderData.created_at,
                                cancelledAt: orderData.cancelled_at,
                                
                                // Customer info
                                customerName,
                                customerEmail: orderData.email,
                                customerPhone,
                                customerId: orderData.customer?.id || null,
                                customerLocation: orderData.customer?.location || null,
                                
                                // Financial information
                                currency: orderData.currency || 'USD',
                                subtotal: String(orderData.subtotal || 0),
                                shipping: String(orderData.shipping || 0),
                                discountValue: String(orderData.discount_value || 0),
                                totalAmount,
                                refundedAmount: String(orderData.refunded_amount || 0),
                                paidByCustomer: String(orderData.paid_by_customer || 0),
                                netPayment: String(orderData.net_payment || 0),
                                originalTotal: String(orderData.original_total || 0),
                                refundable: String(orderData.refundable || 0),
                                
                                // Addresses
                                shippingAddress: orderData.shipping_address,
                                shippingCountry: orderData.shipping_address?.country || null,
                                shippingCity: orderData.shipping_address?.city || null,
                                shippingZip: orderData.shipping_address?.zip || null,
                                shippingState: orderData.shipping_address?.state || null,
                                
                                billingAddress: orderData.billing_address,
                                billingCountry: orderData.billing_address?.country || null,
                                billingCity: orderData.billing_address?.city || null,
                                billingZip: orderData.billing_address?.zip || null,
                                billingState: orderData.billing_address?.state || null,
                                
                                // Source information
                                ipAddress: orderData.client_details?.ip || null,
                                funnelId: orderData.funnel_id || null,
                                storeId: orderData.store_id || null,
                                
                                // Payment info
                                paymentMethod: orderData.payments,
                                financialStatus: orderData.financial_status || 'unknown',
                                
                                // Order status
                                fulfillmentStatus: orderData.fulfillment_status || 'unfulfilled',
                                tags: (orderData.tags || []).join(', '),
                                status: 'CONFIRMED', // Auto-confirmed
                                
                                // Items information
                                itemCount: String(orderData.items?.length || 0),
                                itemsSummary: orderData.items,
                                
                                // Date of automation run
                                date: new Date().toISOString()
                            },
                            {
                                ...config,
                                automationId: automation.id
                            }
                        );
                        metadata.googleSheetsUpdated = true;
                    }
                }
            } catch (lfError: any) {
                console.error(`[LF Auto-Confirm Error] Automation ${automation.id}: Failed to auto-confirm order in LightFunnels. Error:`, lfError);
                metadata.autoConfirmError = lfError.message;
            }
        }

        await prisma.run.update({
            where: { id: runId },
            data: {
                status: runStatus,
                phoneNumber: customerPhone,
                metadata
            }
        });
        
        console.log(`WhatsApp message sent for automation ${automation.id}, result status: ${sendResult.status}, ID: ${sendResult?.key?.id}, awaiting reply: ${requireConfirmation}`);
    } catch (whatsappError: any) {
         console.error(`[WhatsApp Error] Automation ${automation.id}: Failed to send message to ${customerPhone}. Error:`, whatsappError);
         throw new Error(`Failed to send WhatsApp message: ${whatsappError.message}`);
    }

    console.log(`Finished execution for lf-order-to-whatsapp, automation ${automation.id}.`);
}

export async function handleLfOrderReply(
    automation: Automation,
    run: any,
    replyText: string,
    replyMessageId: string
): Promise<{
    status: RunStatus;
    result: Prisma.JsonObject;
    errorMessage?: string;
}> {
    console.log(`[LF Order Handler] Processing reply for Run ${run.id}`);
    
    try {
        let classification: ReplyClassification;
        let aiError: string | null = null;
        
        try {
            classification = await GeminiService.classifyOrderReply(replyText, run.metadata); 
            console.log(`[LF Order Handler] AI classification for Run ${run.id}: ${classification}`);
        } catch (error: any) {
            console.error(`[LF Order Handler] AI classification failed for Run ${run.id}:`, error);
            classification = 'UNCLEAR';
            aiError = error.message;
        }
        let tags:string[] = []


        // 2 .Determine Tags based
         switch (classification) {
             case 'CONFIRM':
                 tags = [OrderTags.CONFIRMED];
                 break;
             case 'DECLINE':
                 tags = [OrderTags.NOT_CONFIRMED];
                 break;
             case 'UNCLEAR':
                  tags = [OrderTags.UNCLEAR]
             default:
                  tags = [OrderTags.UNCLEAR]
                 break;
         }
        let finalStatus ="";

       if(aiError == null) {
           finalStatus = RunStatus.SUCCEEDED;
       }
       else {
           finalStatus = RunStatus.FAILED;
       }
        const orderData = run.triggerPayload?.node as LightfunnelsOrderConfirmedNode;

        try {
            //Get accessToken  from credentials , light funnels connection
            const credentials = run.connectionId != null ? await prisma.connection.findFirst({
                 select: {credentials: true},
                 where: {id: run.connectionId}
             }) : null;

           if (!credentials?.credentials["accessToken"]){
                 console.log("credentials access token in lh service ",credentials)
                 throw new Error ("Lightfunnels token not found in connection");
           }

           const lfService = new LightFunnelsService(credentials.credentials["accessToken"] as string);
            const updateData: UpdateOrderInput = {
                tags: tags, // Set or clear tags
            };
            
            if (orderData != null && orderData.id != null){
                await lfService.updateOrder(orderData.id, updateData);
                console.log(`[LF Order Handler] lightfunnels Order ${orderData?.id} updated status ${finalStatus}`);
                
                // If Google Sheets integration is enabled, update sheet with order status
                const syncToGoogleSheets = run.metadata?.syncToGoogleSheets;
                
                // Get the Google Sheets configuration from the automation object instead of non-existent automationConfig
                const config = automation.config as Config;
                const googleSheetsConnectionId = config.googleSheetsConnectionId;
                const googleSheetId = config.googleSheetId;
                
                if (syncToGoogleSheets && googleSheetsConnectionId && (googleSheetId || config.createNewSheet)) {
                    try {
                        await updateGoogleSheet(
                            googleSheetsConnectionId,
                            googleSheetId || '',
                            {
                                orderNumber: orderData.name,
                                customerName: orderData.customer?.full_name || orderData.shipping_address?.first_name || "Customer",
                                customerEmail: orderData.email,
                                customerPhone: run.phoneNumber,
                                totalAmount: `${orderData.total} ${orderData.currency || 'USD'}`,
                                status: classification === 'CONFIRM' ? 'CONFIRMED' : 
                                       classification === 'DECLINE' ? 'DECLINED' : 'UNCLEAR',
                                date: new Date().toISOString(),
                                replyText
                            },
                            config
                        );
                    } catch (sheetsError: any) {
                        console.error(`[Google Sheets Error] Failed to update Google Sheet for run ${run.id}:`, sheetsError);
                        aiError = `${aiError ? aiError + '; ' : ''}Google Sheets Error: ${sheetsError.message}`;
                    }
                }
            } else {
                console.log("order id is null", orderData)
            }

        } catch (lfError: any) {
            console.error(`[LF Order Handler] Failed to update LF Order, ${lfError}`);
            aiError = `LF Update Error: ${lfError.message}`;
        }
               

        const result: Prisma.JsonObject = {
            classification,
            rawReply: replyText,
            replyMessageId,
            processedAt: new Date().toISOString(),
            error: aiError
        } as Prisma.JsonObject;
        const errorMessage = aiError ? `AI Error: ${aiError}` : undefined;

        return {
            status: finalStatus as RunStatus,
            result,
            errorMessage
        };
        
    } catch (error: any) {
        console.error(`[LF Order Handler] Error processing reply:`, error);
        return {
            status: RunStatus.FAILED,
            result: {
                error: error.message,
                processedAt: new Date().toISOString()
            } as Prisma.JsonObject,
            errorMessage: `Reply processing failed: ${error.message}`
        };
    }
}


async function updateGoogleSheet(
    connectionId: string,
    sheetId: string,
    data: Record<string, any>,
    config?: any
): Promise<void> {
    try {
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId }
        });
        
        if (!connection) {
            throw new Error('Google Sheets connection not found');
        }
        
        const sheetsService = await GoogleSheetsService.fromConnection(connection);
        
        let actualSheetId = sheetId;
        
        if (!actualSheetId && config?.createNewSheet && config?.customSheetName) {
            console.log(`Finding or creating spreadsheet: ${config.customSheetName}`);
            try {
                const spreadsheet = await sheetsService.findOrCreateSpreadsheet(config.customSheetName);
                actualSheetId = spreadsheet.id;
                
                if (config.automationId) {
                    console.log(`Saving spreadsheet ID ${spreadsheet.id} to automation ${config.automationId}`);
                    await prisma.automation.update({
                        where: { id: config.automationId },
                        data: {
                            config: {
                                ...(config as any),
                                googleSheetId: spreadsheet.id,
                                createNewSheet: false 
                            }
                        }
                    });
                }
            } catch (error) {
                console.error(`Error finding/creating spreadsheet: ${error}`);
                throw new Error(`Failed to find or create spreadsheet: ${error}`);
            }
        }
        
        const sheetName = config?.sheetName || 'Sheet1';
        
        const columnConfig = config?.sheetColumns || [];
        const enabledColumns = columnConfig.filter((col: any) => col.enabled);
        
        let filteredData: Record<string, any> = {};
        
        if (enabledColumns.length > 0) {
            enabledColumns.forEach((column: any) => {
                const fieldName = column.field;
                if (data[fieldName] !== undefined) {
                    filteredData[fieldName] = data[fieldName];
                }
            });
        } else {
            filteredData = data;
        }
        
        await sheetsService.updateSheet(actualSheetId, filteredData, {
            sheetName,
            createIfNotExist: true,
            useHeadersFromData: true,
            formatHeaders: true
        });
        
    } catch (error: any) {
        console.error('Error updating Google Sheet:', error);
        throw new Error(`Failed to update Google Sheet: ${error.message}`);
    }
}
