'use server'
import { env } from "@/env.mjs"
import { getCurrentUser } from "@/lib/sessions"
import { prisma } from "@/lib/db"
import { Platform } from "@prisma/client"


interface LightFunnelsTokenResponse {
  access_token: string
}

const LIGHTFUNNELS_SCOPES = ['funnels', 'orders', 'products', 'analytics', 'customers', 'discounts']


export async function exchangeLightFunnelsCode(code: string, state: string) {
  try {
    const response = await fetch('https://api.lightfunnels.com/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: env.LIGHTFUNNELS_CLIENT_ID,
        client_secret: env.LIGHTFUNNELS_CLIENT_SECRET,
        code: code,
      }),
    })

    if (!response.ok) {
      throw new Error('Failed to exchange code for token')
    }

    const data = await response.json() as LightFunnelsTokenResponse

    // Get the current user
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('Unauthorized')
    }

    // Create or update the connection
    const connection = await prisma.connection.create({
      data: {
        userId: user.id,
        platform: Platform.LIGHTFUNNELS,
        credentials: {
          accessToken: data.access_token,
        },
        isActive: true,
        metadata: {
          scopes: LIGHTFUNNELS_SCOPES,
          connectedAt: new Date().toISOString(),
        },
      },
    })

    return connection
  } catch (error) {
    console.error('Error exchanging LightFunnels code:', error)
    throw new Error('Failed to complete LightFunnels connection')
  }
}

