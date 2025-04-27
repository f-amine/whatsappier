import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { env } from "@/env.mjs";
import { getCurrentUser } from "@/lib/sessions";
import { Platform } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/connections?error=missing_params`
      );
    }

    // Exchange code for access tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/connections/google-sheets/callback`,
        grant_type: "authorization_code",
      }).toString(),
    }).then((res) => res.json());

    console.log("Token Response:", tokenResponse);
    if (!tokenResponse.access_token) {
      throw new Error("Failed to exchange token");
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.redirect(
        `${env.NEXT_PUBLIC_APP_URL}/en/connections?error=user_not_found`
      );
    }

    // Store with proper expiry time and refresh token
    await prisma.connection.create({
      data: {
        userId: user.id,
        platform: Platform.GOOGLE_SHEETS,
        credentials: {
          accessToken: tokenResponse.access_token,
          refreshToken: tokenResponse.refresh_token,
          expiresAt: tokenResponse.expires_in 
            ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString() 
            : null,
          tokenType: tokenResponse.token_type || 'Bearer',
          scope: tokenResponse.scope || 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive'
        },
        metadata: {
          connectedAt: new Date().toISOString(),
        },
        isActive: true,
      },
    });

    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/en/connections?success=connected`);
  } catch (error) {
    console.error("Google Sheets OAuth Error:", error);
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/en/connections?error=connection_failed`);
  }
}

