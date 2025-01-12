'use server'

import { prisma } from "@/lib/db"
import { Connection, Platform } from "@prisma/client"
import { getCurrentUser } from "@/lib/sessions"

import { Prisma } from '@prisma/client'

export interface ConnectionWithMetadata extends Omit<Connection, 'credentials' | 'metadata'> {
  credentials: Record<string, any>
  metadata: Record<string, any> | null
}

export interface GetConnectionsOptions {
  platform?: Platform
  isActive?: boolean
  cursor?: string
  limit?: number
  search?: string
}

export interface PaginatedConnectionResponse {
  data: ConnectionWithMetadata[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor?: string
  previousCursor?: string
}

export async function getConnections({
  platform,
  isActive,
  cursor,
  limit = 10,
  search,
}: GetConnectionsOptions = {}): Promise<PaginatedConnectionResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // Build the where clause based on filters
    const where = {
      userId: user.id,
      ...(platform && { platform }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(search && {
        platform: {
          contains: search,
          mode: 'insensitive' as const,
        },
      }),
    }

    const take = cursor ? limit + 1 : limit
    const skip = cursor ? 1 : 0

    const connections = await prisma.connection.findMany({
      where,
      take,
      skip,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: {
        updatedAt: "desc",
      },
    })

    let hasNextPage = false
    let nextCursor: string | undefined
    let hasPreviousPage = !!cursor
    let previousCursor: string | undefined

    // If we got an extra item, we have a next page
    if (connections.length > limit) {
      hasNextPage = true
      connections.pop() // Remove the extra item
      nextCursor = connections[connections.length - 1]?.id
    }

    if (cursor) {
      const previousItem = await prisma.connection.findMany({
        where,
        take: 1,
        skip: 0,
        cursor: { id: cursor },
        orderBy: {
          updatedAt: "asc",
        },
      })
      previousCursor = previousItem[0]?.id
    }

    const transformedConnections = connections.map((connection) => ({
      ...connection,
      metadata: connection.metadata as Record<string, any> | null,
    }))

    // Get total count for informational purposes
    const totalCount = await prisma.connection.count({ where })

    return {
      data: transformedConnections,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    }
  } catch (error) {
    console.error("Error fetching connections:", error)
    throw error
  }
}

export async function getConnectionById(id: string): Promise<ConnectionWithMetadata | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  if (!id) throw new Error("Connection ID is required")

  try {
    const connection = await prisma.connection.findFirst({
      where: { 
        id,
        userId: user.id
      },
    })

    if (!connection) return null

    return {
      ...connection,
      metadata: connection.metadata as Record<string, any> | null,
    }
  } catch (error) {
    console.error("Error fetching connection:", error)
    throw error
  }
}
