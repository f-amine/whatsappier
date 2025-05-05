import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { processPhoneNumber } from '@/lib/automations/helpers/utils';

// Configure CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // In production, limit this to specific domains
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

// Handle preflight OPTIONS requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log(body)
    const { userId, phone, otp, shippingCountry, billingCountry, defaultCountry } = body;
    
    if (!userId || !phone || !otp) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Process phone number using provided country information
    const processedPhone = processPhoneNumber(phone, shippingCountry, billingCountry);
    
    // If normal processing fails, try to add a default country code
    if (!processedPhone.isValid && defaultCountry) {
      // If phone doesn't start with +, try prefixing with default country code
      let phoneWithCountry = phone;
      if (!phone.startsWith('+')) {
        // Clean the phone number first (remove any non-digit characters)
        const cleanedPhone = phone.replace(/\D/g, '');
        phoneWithCountry = `+${defaultCountry}${cleanedPhone}`;
      }
      
      // Try processing again with the modified phone number
      const secondAttempt = processPhoneNumber(phoneWithCountry);
      
      if (secondAttempt.isValid && secondAttempt.phoneNumber) {
        // Use this result instead
        console.log(`Verify: Phone processing succeeded on second attempt with default country: ${phoneWithCountry}`);
        
        // Find valid OTP using the processed phone number
        const validOtp = await prisma.oTP.findFirst({
          where: {
            userId,
            phoneNumber: secondAttempt.phoneNumber,
            code: otp,
            expiresAt: {
              gt: new Date()
            },
            verifiedAt: null
          },
          orderBy: {
            createdAt: 'desc'
          }
        });
        
        if (!validOtp) {
          return NextResponse.json(
            { success: false, message: 'Invalid or expired verification code' },
            { status: 400, headers: corsHeaders }
          );
        }
        
        // Mark the OTP as verified
        await prisma.oTP.update({
          where: { id: validOtp.id },
          data: { verifiedAt: new Date() }
        });
        
        // Record the successful verification for analytics
        await prisma.oTPVerification.create({
          data: {
            userId,
            otpId: validOtp.id,
            source: validOtp.type,
            metadata: {
              phoneNumber: secondAttempt.phoneNumber,
              email: validOtp.email
            }
          }
        });
        
        return NextResponse.json(
          { success: true }, 
          { headers: corsHeaders }
        );
      }
    }
    
    if (!processedPhone.isValid || !processedPhone.phoneNumber) {
      return NextResponse.json(
        { success: false, message: 'Invalid phone number. Please include country code.' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Find the most recent valid OTP for this user and phone
    const validOtp = await prisma.oTP.findFirst({
      where: {
        userId,
        phoneNumber: processedPhone.phoneNumber,
        code: otp,
        expiresAt: {
          gt: new Date()
        },
        verifiedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    if (!validOtp) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired verification code' },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Mark the OTP as verified
    await prisma.oTP.update({
      where: { id: validOtp.id },
      data: { verifiedAt: new Date() }
    });
    
    // Record the successful verification for analytics
    await prisma.oTPVerification.create({
      data: {
        userId,
        otpId: validOtp.id,
        source: validOtp.type,
        metadata: {
          phoneNumber: processedPhone.phoneNumber,
          email: validOtp.email
        }
      }
    });
    
    return NextResponse.json(
      { success: true }, 
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to verify OTP' },
      { status: 500, headers: corsHeaders }
    );
  }
}
