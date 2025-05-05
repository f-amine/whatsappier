// /whatsappier/app/api/otp/lightfunnels/request/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processPhoneNumber } from '@/lib/automations/helpers/utils'; // Ensure this is imported
import { executeLfOtpRequest } from '@/lib/automations/execution/lf-otp-verification'; // Import the execution logic

// Configure CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: corsHeaders });
}

export async function POST(request: NextRequest) {
  const automationId = request.nextUrl.searchParams.get('automationId');

  if (!automationId) {
    return NextResponse.json(
      { success: false, message: 'Missing automationId parameter' },
      { status: 400, headers: corsHeaders }
    );
  }

  try {
    const body = await request.json();

    console.log(body)
    const { phone, email, isTest, shippingCountry, billingCountry } = body;

    if (!phone) {
      return NextResponse.json(
        { success: false, message: 'Missing required field: phone' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Fetch the automation configuration
    const automation = await prisma.automation.findUnique({
      where: { id: automationId },
    });

    if (!automation) {
      return NextResponse.json(
        { success: false, message: 'Automation not found' },
        { status: 404, headers: corsHeaders }
      );
    }
    if (!automation.isActive) {
        return NextResponse.json(
            { success: false, message: 'Automation is inactive' },
            { status: 403, headers: corsHeaders }
        );
    }

    const processedPhone = processPhoneNumber(phone, shippingCountry, billingCountry);

    if (!processedPhone.isValid || !processedPhone.phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number. Please include country code or ensure it is correct.' },
        { status: 400, headers: corsHeaders }
      );
    }

    await executeLfOtpRequest(automation, {
      phone: processedPhone.phoneNumber, 
      email: email || null,
      isTest: isTest || false,
      shippingCountry: shippingCountry,
      billingCountry: billingCountry
    });

    return NextResponse.json(
      { success: true },
      { headers: corsHeaders }
    );

  } catch (error: any) {
    console.error('[API OTP Request Error]', error);
    const message = error.message?.includes('WhatsApp device') || error.message?.includes('Configuration')
        ? 'Service configuration error. Please contact support.'
        : 'Failed to send OTP. Please try again later.';

    return NextResponse.json(
      { success: false, message: message },
      { status: 500, headers: corsHeaders }
    );
  }
}
