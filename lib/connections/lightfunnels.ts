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
    // Verify state matches to prevent CSRF attacks
    // You should implement state verification logic here

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

// Verify if the connection is still valid
export async function verifyLightFunnelsConnection(connectionId: string) {
  try {
    const connection = await prisma.connection.findUnique({
      where: { id: connectionId },
    })

    if (!connection) {
      throw new Error('Connection not found')
    }

    const accessToken = (connection.credentials as any).accessToken

    // Make a test API call to verify the token
    const response = await fetch('https://app.lightfunnels.com/api/v2/shop', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    })

    const isValid = response.ok

    // Update connection status
    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        isActive: isValid,
        metadata: {
          ...connection.metadata,
          lastVerified: new Date().toISOString(),
        },
      },
    })

    return isValid
  } catch (error) {
    console.error('Error verifying LightFunnels connection:', error)
    return false
  }
}
