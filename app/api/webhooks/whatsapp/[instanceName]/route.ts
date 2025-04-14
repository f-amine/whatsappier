import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { RunStatus } from '@prisma/client';
import { AutomationExecutor } from '@/lib/automations/engine/AutomationExecutor';
import { addHours } from 'date-fns';

// Interface for payload (use the detailed one)
interface WhatsAppUpsertPayload {
    event: string;
    instance: string;
    data: {
        key: {
            remoteJid: string;
            fromMe: boolean;
            id: string;
        };
        pushName?: string;
        messageTimestamp: number;
        message?: {
            conversation?: string;
            extendedTextMessage?: {
                text: string;
                contextInfo?: any;
            };
             messageContextInfo?: any;
        };
        messageType?: string;
        status?: string;
        instanceId?: string;
        source?: string;
    };
    destination?: string;
    date_time?: string;
    sender?: string;
    server_url?: string;
    apikey?: string;
}

export async function POST(
    request: NextRequest,
    { params }: { params: { instanceName: string } }
) {
    const { instanceName } = await params;
    console.log(`[WH Webhook] Received event for instance: ${instanceName}`);

    try {
        const payload: WhatsAppUpsertPayload = await request.json();

        // Basic validation & ignore own messages/non-upsert events
        if (payload.event !== 'messages.upsert' || !payload.data?.key || payload.data.key.fromMe) {
            console.log(`[WH Webhook] Ignoring event type '${payload.event}' or message (fromMe=${payload.data?.key?.fromMe}).`);
            return NextResponse.json({ success: true, message: "Event/Message ignored" }, { status: 200 });
        }

        const incomingMessage = payload.data;
        const customerJid = incomingMessage.key.remoteJid; // e.g., 212605153841@s.whatsapp.net
        const replyMessageId = incomingMessage.key.id;

        // --- Extract Reply Text ---
        const replyText = incomingMessage.message?.conversation ?? incomingMessage.message?.extendedTextMessage?.text;
        // --- End Text Extraction ---

        if (!replyText) {
            console.log('[WH Webhook] Ignoring message (no text content).');
            return NextResponse.json({ success: true, message: "Message ignored (no text)" }, { status: 200 });
        }

        // --- Normalize Sender's Phone Number ---
        const normalizedCustomerPhone = customerJid?.split('@')[0]?.replace(/[^0-9]/g, '');
        if (!normalizedCustomerPhone) {
            console.log(`[WH Webhook] Could not normalize sender JID: ${customerJid}. Ignoring.`);
            return NextResponse.json({ success: true, message: "Cannot normalize sender JID" }, { status: 200 });
        }
        // --- End Normalization ---

        console.log(`[WH Webhook] Processing Message - From JID: ${customerJid} (Normalized: ${normalizedCustomerPhone}), ReplyMsgID: ${replyMessageId}, Text: "${replyText}"`);

        // --- Find Device ID from Instance Name ---
        const device = await prisma.device.findUnique({
             where: { name: instanceName },
             select: { id: true }
        });
        if (!device) {
            console.warn(`[WH Webhook] Device not found for instanceName: ${instanceName}. Cannot match run. Ignoring message.`);
             return NextResponse.json({ success: true, message: "Device instance not found" }, { status: 200 });
        }
        const deviceId = device.id;
        // --- End Device ID Lookup ---

        const lookbackTime = addHours(new Date(), -48); // 48-hour window

        // --- Find the relevant Run using Phone, Status, Device ID, Time ---
        // REMOVED quotedMessageId / sentMessageId from the query
        const targetRun = await prisma.run.findFirst({
            where: {
                phoneNumber: normalizedCustomerPhone,      // Match the sender's normalized phone
                status: RunStatus.WAITING_REPLY,          // Must be waiting
                automation: {                              // Match via the automation relation
                    deviceId: deviceId                     // Automation must be linked to this device
                },
            },
            orderBy: {
                startedAt: 'desc' // Get the most recent matching run
            },
        });

        if (!targetRun) {
            console.log(`[WH Webhook] No recent run found in WAITING_REPLY for phone ${normalizedCustomerPhone} on device ${deviceId}. Ignoring message.`);
            return NextResponse.json({ success: true, message: "No matching run found waiting for reply" }, { status: 200 });
        }
        // --- End Finding Run ---

        // --- Ambiguity Check (Still recommended) ---
        const ambiguousRuns = await prisma.run.findMany({
            where: {
                id: { not: targetRun.id }, // Exclude the one we found
                phoneNumber: normalizedCustomerPhone,
                status: RunStatus.WAITING_REPLY,
                automation: { deviceId: deviceId },
                startedAt: { gte: lookbackTime }
            },
            take: 1
        });

        if (ambiguousRuns.length > 0) {
             console.warn(`[WH Webhook] Ambiguous reply: Found multiple runs waiting for ${normalizedCustomerPhone} on device ${deviceId}. Ignoring message and failing first found run (${targetRun.id}).`);
             // Optionally fail the first found run to prevent it from staying stuck
             await prisma.run.update({
                    where: { id: targetRun.id },
                    data: { status: RunStatus.FAILED, errorMessage: "Ambiguous reply received, multiple runs waiting.", finishedAt: new Date() }
             }).catch(e => console.error("Failed to mark ambiguous run as failed", e));
             return NextResponse.json({ success: true, message: "Ambiguous reply, multiple runs waiting" }, { status: 200 });
        }

        console.log(`[WH Webhook] Found unique matching Run ID: ${targetRun.id}. Delegating processing...`);

        // --- Delegate Processing ---
        AutomationExecutor.processReply(targetRun.id, replyText, replyMessageId)
            .catch(err => {
                console.error(`[WH Webhook] Error during async reply processing for Run ${targetRun.id}:`, err);
                // Consider updating the run to FAILED here as well if the async process fails immediately
            });
        // --- End Delegation ---

        // --- Acknowledge Receipt Immediately ---
        return NextResponse.json({ success: true, message: "Reply received, processing initiated" }, { status: 200 });

    } catch (error: any) {
        console.error(`[WH Webhook] Error processing incoming message for ${instanceName}:`, error);
        if (error instanceof SyntaxError) { return NextResponse.json({ error: 'Bad Request: Invalid JSON payload' }, { status: 400 }); }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
