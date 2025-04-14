import { NextRequest, NextResponse } from 'next/server';
import { TriggerHandler } from '@/lib/automations/TriggerHandler';
import { headers } from 'next/headers';


export async function POST(
  request: NextRequest,
  { params }: { params: { automationId: string } }
) {
  const { automationId } = await params;

  // Log incoming request details for debugging
  console.log(`Received POST request for automation ID: ${automationId}`);

  if (!automationId) {
      console.error("Missing automationId in webhook URL params");
      return NextResponse.json({ error: 'Bad Request: Missing automation ID' }, { status: 400 });
  }

  // TODO: Implement Webhook Signature Verification (Crucial for security)
  // This needs to be platform-specific (e.g., check X-Lightfunnels-Hmac-Sha256 for LF)
  // const sourcePlatform = determineSourcePlatform(headersList); // You'd need logic to guess platform from headers/payload
  // const signature = headersList.get(getSignatureHeader(sourcePlatform));
  // const rawBody = await request.text(); // Read body *once* if verifying
  // const secret = await getWebhookSecretForAutomation(automationId, sourcePlatform); // Fetch secret from DB/config
  // const isValid = verifySignature(rawBody, signature, secret);
  // if (!isValid) {
  //   console.warn(`Invalid webhook signature for automation ${automationId}`);
  //   return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  // }
  // const payload = JSON.parse(rawBody); // Parse after verification

  try {
    const payload: any = await request.json(); // Parse the body (use this if not verifying signature above)

    if (!payload || typeof payload !== 'object' || Object.keys(payload).length === 0) {
         console.warn(`Received empty or invalid payload for automation ${automationId}. Payload:`, payload);
         // Still acknowledge to prevent retries from source, but log the issue.
         return NextResponse.json({ success: true, message: "Webhook received (empty payload)" }, { status: 200 });
         // Or return 400 if you want the source to know it was bad:
         // return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    console.log(`Payload received for ${automationId}:`, JSON.stringify(payload, null, 2));

    // Asynchronously handle the trigger processing
    // DO NOT await here, respond immediately.
    TriggerHandler.handleGenericWebhook(automationId, payload);

    // Immediately respond to acknowledge receipt
    return NextResponse.json({ success: true, message: "Webhook received and processing initiated" }, { status: 200 });

  } catch (error: any) {
    console.error(`Error processing webhook for automation ${automationId}:`, error);
    // Avoid sending detailed errors back in the response for security
    // Log the error server-side.
    // Still return 200 to prevent retries if possible, unless it's a payload format error (then maybe 400)
    if (error instanceof SyntaxError) {
         console.error("Failed to parse webhook JSON payload.");
         return NextResponse.json({ error: 'Bad Request: Invalid JSON payload' }, { status: 400 });
    }
    console.log(error)
    return NextResponse.json({ error: 'Internal server error processing webhook' }, { status: 500 });
  }
}
