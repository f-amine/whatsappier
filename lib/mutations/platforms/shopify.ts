'use server'
import { validateShopifyCredentials } from "@/components/platforms/shopify/helper"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { Platform } from "@prisma/client"
import { revalidatePath } from "next/cache"

interface ConnectShopifyParams {
  shopUrl: string
  adminApiKey: string
}

export async function connectShopifyStore(params: ConnectShopifyParams) {
  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      throw new Error("Unauthorized")
    }

    const auth = {
      shopUrl: params.shopUrl,
      adminToken: params.adminApiKey,
    }

    const validation = await validateShopifyCredentials(auth)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const connection = await prisma.connection.create({
      data: {
        userId: user.id,
        platform: Platform.SHOPIFY,
        credentials: {
          shopUrl: validation.normalizedShopUrl, 
          adminApiKey: params.adminApiKey,
          originalDomain: params.shopUrl,
        },
        metadata: {
          shopData: validation.shopData
        },
        isActive: true,
      },
    })

    revalidatePath('/connections')
    return { success: true, connection }
  } catch (error) {
    console.error('Error connecting Shopify store:', error)
    throw error
  }
}
