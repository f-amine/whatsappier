import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { auth } from '@/auth';

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

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Verify authentication
    const session = await auth();
    
    if (!session || !session.user || session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Get OTP settings for the user
    const settings = await prisma.lightfunnelsOtpSettings.findUnique({
      where: { userId }
    });
    
    if (!settings) {
      // Return default settings if none exist
      return NextResponse.json({
        id: null,
        userId,
        enabled: false,
        messageTemplate: 'Your verification code for checkout is: {{otp}}. This code will expire in 10 minutes.',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching Lightfunnels OTP settings:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, enabled, messageTemplate } = body;
    
    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }
    
    // Verify authentication
    const session = await auth();
    
    if (!session || !session.user || session.user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if settings already exist
    const existingSettings = await prisma.lightfunnelsOtpSettings.findUnique({
      where: { userId }
    });
    
    let settings;
    
    if (existingSettings) {
      // Update existing settings
      settings = await prisma.lightfunnelsOtpSettings.update({
        where: { userId },
        data: {
          enabled,
          messageTemplate,
          updatedAt: new Date()
        }
      });
    } else {
      // Create new settings
      settings = await prisma.lightfunnelsOtpSettings.create({
        data: {
          userId,
          enabled,
          messageTemplate
        }
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error updating Lightfunnels OTP settings:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
