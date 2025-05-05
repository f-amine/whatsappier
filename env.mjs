import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    // This is optional because it's only used in development.
    // See https://next-auth.js.org/deployment.
    NEXTAUTH_URL: z.string().url().optional(),
    AUTH_SECRET: z.string().min(1),
    GOOGLE_CLIENT_ID: z.string().min(1),
    GOOGLE_CLIENT_SECRET: z.string().min(1),
    DATABASE_URL: z.string().min(1),
    RESEND_API_KEY: z.string().min(1),
    EMAIL_FROM: z.string().min(1),
    LIGHTFUNNELS_CLIENT_ID: z.string().min(1),
    LIGHTFUNNELS_CLIENT_SECRET: z.string().min(1),
    LF_URL: z.string().min(1),
    WEBHOOKS_URL: z.string().min(1),
    GEMINI_API_KEY: z.string().min(1),
    AP_WHATSAPPIER_API_KEY: z.string().min(1),
    AP_WHATSAPPIER_SERVER_URL: z.string().min(1)
  },
  client: {
    NEXT_PUBLIC_APP_URL: z.string().min(1),
  },
  runtimeEnv: {
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    EMAIL_FROM: process.env.EMAIL_FROM,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    LIGHTFUNNELS_CLIENT_ID: process.env.LIGHTFUNNELS_CLIENT_ID,
    LIGHTFUNNELS_CLIENT_SECRET: process.env.LIGHTFUNNELS_CLIENT_SECRET,
    LF_URL: process.env.LF_URL,
    WEBHOOKS_URL: process.env.WEBHOOKS_URL,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    AP_WHATSAPPIER_API_KEY: process.env.AP_WHATSAPPIER_API_KEY,
    AP_WHATSAPPIER_SERVER_URL: process.env.AP_WHATSAPPIER_SERVER_URL
  },
});
