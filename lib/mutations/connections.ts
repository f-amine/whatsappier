'use server'

import { Platform } from "@prisma/client"
import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { revalidatePath } from "next/cache"

export interface CreateConnectionInput {
  platform: Platform
  credentials: {
    apiKey?: string
    apiSecret?: string
    accessToken?: string
    [key: string]: string | undefined
  }
}

export async function createConnection(data: CreateConnectionInput) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // In a real application, you might want to encrypt the credentials
    // before storing them in the database
    const connection = await prisma.connection.create({
      data: {
        userId: user.id,
        platform: data.platform,
        credentials: data.credentials,
        isActive: true,
      },
    })

    revalidatePath('/connections')
    return connection
  } catch (error) {
    console.error('Error creating connection:', error)
    throw new Error('Failed to create connection')
  }
}

export async function deleteConnection(connectionId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify the connection belongs to the user
    const connection = await prisma.connection.findFirst({
      where: {
        id: connectionId,
        userId: user.id,
      },
    })

    if (!connection) {
      throw new Error("Connection not found")
    }

    await prisma.connection.delete({
      where: {
        id: connectionId,
      },
    })

    revalidatePath('/connections')
    return { success: true }
  } catch (error) {
    console.error('Error deleting connection:', error)
    throw new Error('Failed to delete connection')
  }
}

export async function bulkDeleteConnections(connectionIds: string[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify all connections belong to the user
    const connections = await prisma.connection.findMany({
      where: {
        id: {
          in: connectionIds,
        },
        userId: user.id,
      },
    })

    if (connections.length !== connectionIds.length) {
      throw new Error("One or more connections not found")
    }

    await prisma.connection.deleteMany({
      where: {
        id: {
          in: connectionIds,
        },
        userId: user.id,
      },
    })

    revalidatePath('/connections')
    return { success: true }
  } catch (error) {
    console.error('Error bulk deleting connections:', error)
    throw new Error('Failed to delete connections')
  }
}
