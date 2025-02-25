'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { Order, OrderStatus } from "@prisma/client"

export interface OrderWithMetadata extends Order {
  metadata: Record<string, any> | null
  connection: {
    platform: string
    isActive: boolean
  }
}

export interface GetOrdersOptions {
  status?: OrderStatus
  cursor?: string
  limit?: number
  search?: string
}

export interface PaginatedOrderResponse {
  data: OrderWithMetadata[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor?: string
  previousCursor?: string
}

export async function getOrders({
  status,
  cursor,
  limit = 10,
  search,
}: GetOrdersOptions = {}): Promise<PaginatedOrderResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // Get all active connections for the user
    const connections = await prisma.connection.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    const connectionIds = connections.map(c => c.id)

    // Build the where clause based on filters
    const where = {
      connectionId: { in: connectionIds },
      ...(status && { status }),
      ...(search && {
        OR: [
          {
            customerName: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            customerEmail: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    }

    const take = cursor ? limit + 1 : limit
    const skip = cursor ? 1 : 0

    const orders = await prisma.order.findMany({
      where,
      take,
      skip,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: {
        createdAt: "desc",
      },
      include: {
        connection: {
          select: {
            platform: true,
            isActive: true,
          },
        },
      },
    })

    let hasNextPage = false
    let nextCursor: string | undefined
    let hasPreviousPage = !!cursor
    let previousCursor: string | undefined

    if (orders.length > limit) {
      hasNextPage = true
      orders.pop()
      nextCursor = orders[orders.length - 1]?.id
    }

    if (cursor) {
      const previousItem = await prisma.order.findMany({
        where,
        take: 1,
        skip: 0,
        cursor: { id: cursor },
        orderBy: {
          createdAt: "asc",
        },
      })
      previousCursor = previousItem[0]?.id
    }

    const totalCount = await prisma.order.count({ where })

    return {
      data: orders as OrderWithMetadata[],
      totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    }
  } catch (error) {
    console.error("Error fetching orders:", error)
    throw error
  }
}

export async function getOrderById(id: string): Promise<OrderWithMetadata | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const connections = await prisma.connection.findMany({
      where: {
        userId: user.id,
        isActive: true,
      },
      select: {
        id: true,
      },
    })

    const connectionIds = connections.map(c => c.id)

    const order = await prisma.order.findFirst({
      where: { 
        id,
        connectionId: { in: connectionIds }
      },
      include: {
        connection: {
          select: {
            platform: true,
            isActive: true,
          },
        },
      },
    })

    if (!order) return null

    return order as OrderWithMetadata
  } catch (error) {
    console.error("Error fetching order:", error)
    throw error
  }
}
