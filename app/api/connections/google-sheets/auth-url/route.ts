import { NextResponse } from "next/server";
import { env } from "@/env.mjs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/connections/google-sheets/callback`;

  const url = new URL("https://accounts.google.com/o/oauth2/auth");
  url.searchParams.append("client_id", env.GOOGLE_CLIENT_ID);
  url.searchParams.append("redirect_uri", redirectUri);
  url.searchParams.append("response_type", "code");
  url.searchParams.append("access_type", "offline");
  url.searchParams.append("scope", "https://www.googleapis.com/auth/spreadsheets");
  url.searchParams.append("prompt", "consent");

  return NextResponse.json({ url: url.toString() });
}
