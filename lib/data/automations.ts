'use server'

import { prisma } from "@/lib/db"
import { Automation, TriggerType } from "@prisma/client"
import { getCurrentUser } from "@/lib/sessions"

export interface AutomationWithMeta extends Automation {
  metadata: Record<string, any> | null
  connection: {
    platform: string
    isActive: boolean
  }
  device: {
    name: string
    status: string
  }
  template: {
    name: string
  }
}

export interface GetAutomationsOptions {
  trigger?: TriggerType
  isActive?: boolean
  cursor?: string
  limit?: number
  search?: string
}

export interface PaginatedAutomationResponse {
  data: AutomationWithMeta[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor?: string
  previousCursor?: string
}

export async function getAutomations({
  trigger,
  isActive,
  cursor,
  limit = 10,
  search,
}: GetAutomationsOptions = {}): Promise<PaginatedAutomationResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const where = {
      userId: user.id,
      ...(trigger && { trigger }),
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            }
          },
          {
            description: {
              contains: search,
              mode: 'insensitive' as const,
            }
          }
        ]
      })
    }

    const take = cursor ? limit + 1 : limit
    const skip = cursor ? 1 : 0

    const automations = await prisma.automation.findMany({
      where,
      take,
      skip,
      ...(cursor && { cursor: { id: cursor } }),
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        connection: {
          select: {
            platform: true,
            isActive: true
          }
        },
        device: {
          select: {
            name: true,
            status: true
          }
        },
        template: {
          select: {
            name: true
          }
        }
      }
    })

    let hasNextPage = false
    let nextCursor: string | undefined
    let hasPreviousPage = !!cursor
    let previousCursor: string | undefined

    if (automations.length > limit) {
      hasNextPage = true
      automations.pop()
      nextCursor = automations[automations.length - 1]?.id
    }

    if (cursor) {
      const previousItem = await prisma.automation.findMany({
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

    const transformedAutomations = automations.map((automation) => ({
      ...automation,
      metadata: automation.metadata as Record<string, any> | null,
    }))

    const totalCount = await prisma.automation.count({ where })

    return {
      data: transformedAutomations,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    }
  } catch (error) {
    console.error("Error fetching automations:", error)
    throw error
  }
}

export async function getAutomationById(id: string): Promise<AutomationWithMeta | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  if (!id) throw new Error("Automation ID is required")

  try {
    const automation = await prisma.automation.findFirst({
      where: { 
        id,
        userId: user.id
      },
      include: {
        connection: {
          select: {
            platform: true,
            isActive: true
          }
        },
        device: {
          select: {
            name: true,
            status: true
          }
        },
        template: {
          select: {
            name: true
          }
        }
      }
    })

    if (!automation) return null

    return {
      ...automation,
      metadata: automation.metadata as Record<string, any> | null,
    }
  } catch (error) {
    console.error("Error fetching automation:", error)
    throw error
  }
}
