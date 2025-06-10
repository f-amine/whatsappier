
import { Automation, RunStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import {
    LightfunnelsWebhookEventPayload,
    LightfunnelsOrderConfirmedNode,
} from '../helpers/lightfunnels';
import { z } from 'zod';
import { GoogleSheetsService } from '../helpers/google-sheets';
import { GsheetsOrderSyncConfigSchema } from '../templates/definitions/lf-sheet-order-sync';

type Config = z.infer<typeof GsheetsOrderSyncConfigSchema>;

export async function executeGsheetsOrderSync(
    automation: Automation,
    triggerPayload: LightfunnelsWebhookEventPayload,
    config: Config,
    runId: string
): Promise<void> {

    if (!triggerPayload.node || typeof triggerPayload.node !== 'object') {
        console.error(`[Execution Error] Automation ${automation.id}: Missing or invalid 'node' object in trigger payload.`);
        throw new Error("Invalid trigger payload structure: 'node' object missing or invalid.");
    }
    
    const orderData = triggerPayload.node as LightfunnelsOrderConfirmedNode;

    if (typeof orderData.id !== 'string' || typeof orderData.total !== 'number' || typeof orderData.email !== 'string') {
         console.error(`[Execution Error] Automation ${automation.id}: Payload 'node' object missing critical fields for Order Confirmed.`);
        throw new Error("Payload structure mismatch: Missing critical Order Confirmed fields.");
    }

    console.log(`Executing gsheets-order-sync for automation ${automation.id}, order ID ${orderData.id}`);

    const shouldSync = await shouldSyncOrder(orderData, config);
    if (!shouldSync) {
        console.log(`[Skip] Automation ${automation.id}: Order ${orderData.id} does not match sync criteria`);
        await prisma.run.update({
            where: { id: runId },
            data: { 
                status: RunStatus.SUCCEEDED, 
                finishedAt: new Date(),
                metadata: { reason: 'Order does not match sync criteria' }
            }
        });
        return;
    }

    const gsConnection = await prisma.connection.findUnique({
        where: { id: config.googleSheetsConnectionId }
    });

    if (!gsConnection) {
        throw new Error(`Google Sheets connection ${config.googleSheetsConnectionId} not found.`);
    }

    const sheetsService = await GoogleSheetsService.fromConnection(gsConnection);

    const syncData = prepareOrderDataForSync(orderData, config);

    try {
        await sheetsService.updateSheet(
            config.googleSheetId,
            syncData,
            {
                sheetName: config.worksheetName,
                createIfNotExist: true,
                useHeadersFromData: true,
                formatHeaders: true
            }
        );

        console.log(`Successfully synced order ${orderData.id} to Google Sheets for automation ${automation.id}`);
        
        await prisma.run.update({
            where: { id: runId },
            data: { 
                status: RunStatus.SUCCEEDED, 
                finishedAt: new Date(),
                metadata: { 
                    syncedOrderId: orderData.id,
                    spreadsheetId: config.googleSheetId,
                    worksheetName: config.worksheetName
                }
            }
        });

    } catch (error: any) {
        console.error(`[Google Sheets Sync Error] Automation ${automation.id}: Failed to sync order ${orderData.id}. Error:`, error);
        throw new Error(`Failed to sync to Google Sheets: ${error.message}`);
    }

    console.log(`Finished execution for gsheets-order-sync, automation ${automation.id}.`);
}

async function shouldSyncOrder(orderData: LightfunnelsOrderConfirmedNode, config: Config): Promise<boolean> {
    // Check funnel/source criteria
    if (config.syncSource === 'specific_funnel') {
        if (orderData.funnel_id !== config.funnelId) {
            return false;
        }
    } else if (config.syncSource === 'specific_store') {
        if (orderData.store_id !== config.storeId) {
            return false;
        }
    }

    if (config.productFilter === 'specific_product') {
        const hasTargetProduct = orderData.items?.some(item => 
            item.product_id === config.productId
        );
        if (!hasTargetProduct) {
            return false;
        }
    }

    return true;
}

function prepareOrderDataForSync(orderData: LightfunnelsOrderConfirmedNode, config: Config): Record<string, any> {
    const enabledColumns = config.sheetColumns?.filter(col => col.enabled) || [];
    const syncData: Record<string, any> = {};

    enabledColumns.forEach(column => {
        const fieldName = column.field;
        
        switch (fieldName) {
            case 'date':
                syncData[fieldName] = new Date().toISOString();
                break;
            case 'orderNumber':
                syncData[fieldName] = orderData.name;
                break;
            case 'orderId':
                syncData[fieldName] = orderData.id;
                break;
            case 'internalId':
                syncData[fieldName] = orderData._id;
                break;
            case 'createdAt':
                syncData[fieldName] = orderData.created_at;
                break;
            case 'cancelledAt':
                syncData[fieldName] = orderData.cancelled_at;
                break;
            case 'customerName':
                syncData[fieldName] = orderData.customer?.full_name || 'Unknown';
                break;
            case 'customerEmail':
                syncData[fieldName] = orderData.email;
                break;
            case 'customerPhone':
                syncData[fieldName] = orderData.phone;
                break;
            case 'customerId':
                syncData[fieldName] = orderData.customer?.id;
                break;
            case 'customerLocation':
                syncData[fieldName] = orderData.customer?.location;
                break;
            case 'currency':
                syncData[fieldName] = orderData.currency || 'USD';
                break;
            case 'subtotal':
                syncData[fieldName] = orderData.subtotal;
                break;
            case 'shipping':
                syncData[fieldName] = orderData.shipping;
                break;
            case 'discountValue':
                syncData[fieldName] = orderData.discount_value;
                break;
            case 'totalAmount':
                syncData[fieldName] = `${orderData.total} ${orderData.currency || 'USD'}`;
                break;
            case 'refundedAmount':
                syncData[fieldName] = orderData.refunded_amount;
                break;
            case 'paidByCustomer':
                syncData[fieldName] = orderData.paid_by_customer;
                break;
            case 'netPayment':
                syncData[fieldName] = orderData.net_payment;
                break;
            case 'originalTotal':
                syncData[fieldName] = orderData.original_total;
                break;
            case 'refundable':
                syncData[fieldName] = orderData.refundable;
                break;
            case 'shippingAddress':
                syncData[fieldName] = JSON.stringify(orderData.shipping_address);
                break;
            case 'shippingCountry':
                syncData[fieldName] = orderData.shipping_address?.country;
                break;
            case 'shippingCity':
                syncData[fieldName] = orderData.shipping_address?.city;
                break;
            case 'shippingZip':
                syncData[fieldName] = orderData.shipping_address?.zip;
                break;
            case 'shippingState':
                syncData[fieldName] = orderData.shipping_address?.state;
                break;
            case 'billingAddress':
                syncData[fieldName] = JSON.stringify(orderData.billing_address);
                break;
            case 'billingCountry':
                syncData[fieldName] = orderData.billing_address?.country;
                break;
            case 'billingCity':
                syncData[fieldName] = orderData.billing_address?.city;
                break;
            case 'billingZip':
                syncData[fieldName] = orderData.billing_address?.zip;
                break;
            case 'billingState':
                syncData[fieldName] = orderData.billing_address?.state;
                break;
            case 'ipAddress':
                syncData[fieldName] = orderData.client_details?.ip;
                break;
            case 'funnelId':
                syncData[fieldName] = orderData.funnel_id;
                break;
            case 'storeId':
                syncData[fieldName] = orderData.store_id;
                break;
            case 'paymentMethod':
                syncData[fieldName] = JSON.stringify(orderData.payments);
                break;
            case 'financialStatus':
                syncData[fieldName] = orderData.financial_status;
                break;
            case 'fulfillmentStatus':
                syncData[fieldName] = orderData.fulfillment_status;
                break;
            case 'tags':
                syncData[fieldName] = orderData.tags?.join(', ');
                break;
            case 'status':
                syncData[fieldName] = 'CONFIRMED';
                break;
            case 'itemCount':
                syncData[fieldName] = orderData.items?.length || 0;
                break;
            case 'itemsSummary':
                syncData[fieldName] = JSON.stringify(orderData.items);
                break;
            default:
                if (orderData[fieldName as keyof LightfunnelsOrderConfirmedNode] !== undefined) {
                    syncData[fieldName] = orderData[fieldName as keyof LightfunnelsOrderConfirmedNode];
                }
                break;
        }
    });

    return syncData;
}
