import { Automation, Prisma, RunStatus } from '@prisma/client';
import { WhatsAppService } from '../helpers/whatsapp';
import { prisma } from '@/lib/db';
import {
    LightfunnelsWebhookEventPayload,
    LightfunnelsOrderConfirmedNode,
    LightFunnelsService,
    UpdateOrderInput // Make sure have this one
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
                                orderNumber,
                                customerName,
                                customerEmail: orderData.email,
                                customerPhone,
                                totalAmount,
                                status: 'CONFIRMED',
                                date: new Date().toISOString()
                            },
                            config
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

interface OrderSheetData {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: string;
    status: string;
    date: string;
    replyText?: string;
}

async function updateGoogleSheet(
    connectionId: string,
    sheetId: string,
    data: OrderSheetData,
    config?: any // Add config parameter
): Promise<void> {
    try {
        const connection = await prisma.connection.findUnique({
            where: { id: connectionId }
        });
        
        if (!connection) {
            throw new Error('Google Sheets connection not found');
        }
        
        const sheetsService = await GoogleSheetsService.fromConnection(connection);
        
        // Handle new sheet creation if needed
        let actualSheetId = sheetId;
        let isNewSheet = false;
        
        if (config?.createNewSheet && config?.customSheetName) {
            console.log(`Creating new sheet: ${config.customSheetName}`);
            const newSheet = await sheetsService.createNewSpreadsheet(config.customSheetName);
            actualSheetId = newSheet.id;
            isNewSheet = true;
        }
        
        // Get column configuration or use defaults
        const columnConfig = config?.sheetColumns || [
            { field: 'date', enabled: true },
            { field: 'orderNumber', enabled: true },
            { field: 'customerName', enabled: true },
            { field: 'customerEmail', enabled: true },
            { field: 'customerPhone', enabled: true },
            { field: 'totalAmount', enabled: true },
            { field: 'status', enabled: true },
            { field: 'replyText', enabled: true }
        ];
        
        // Build headers and values based on enabled columns
        const headers: string[] = [];
        const rowValues: string[] = [];
        
        // Map of field names to display names for headers
        const fieldDisplayNames: Record<string, string> = {
            date: 'Date',
            orderNumber: 'Order Number',
            customerName: 'Customer Name',
            customerEmail: 'Customer Email',
            customerPhone: 'Customer Phone',
            totalAmount: 'Total Amount',
            status: 'Status',
            replyText: 'Customer Reply'
        };
        
        // Build row data based on enabled columns
        columnConfig.forEach(column => {
            if (column.enabled) {
                const fieldName = column.field as keyof OrderSheetData;
                const fieldValue = data[fieldName] || '';
                headers.push(fieldDisplayNames[fieldName] || fieldName);
                rowValues.push(fieldValue);
            }
        });
        
        // Get sheet name from config or use default
        const sheetName = config?.sheetName || 'Sheet1';
        
        // Check if the sheet has any data first
        try {
            const existingData = await sheetsService.getSheetData(actualSheetId, sheetName);
            const isEmpty = !existingData || existingData.length === 0;
            
            if (isEmpty) {
                // Sheet is empty, add headers and data
                console.log(`Adding headers and data to empty sheet ${sheetName} in spreadsheet ${actualSheetId}`);
                const values = [headers, rowValues];
                await sheetsService.addRowToSheet(actualSheetId, sheetName, values, false);
            } else {
                // Sheet has data, just add the new row
                console.log(`Adding data to existing sheet ${sheetName} in spreadsheet ${actualSheetId}`);
                await sheetsService.addRowToSheet(actualSheetId, sheetName, [rowValues], false);
            }
        } catch (error) {
            // If checking existing data fails, try to add headers and data anyway
            console.log(`Error checking sheet data, attempting to add headers and data: ${error}`);
            const values = [headers, rowValues];
            await sheetsService.addRowToSheet(actualSheetId, sheetName, values, true);
        }
        
    } catch (error: any) {
        console.error('Error updating Google Sheet:', error);
        throw new Error(`Failed to update Google Sheet: ${error.message}`);
    }
} 
