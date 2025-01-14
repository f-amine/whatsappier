// lib/data/templates.ts
'use server'

import { prisma } from "@/lib/db"
import { Template } from "@prisma/client"
import { getCurrentUser } from "@/lib/sessions"

export interface TemplateWithVariables extends Template {
  variables: string[]
}

export interface GetTemplatesOptions {
  cursor?: string
  limit?: number
  search?: string
}

export interface PaginatedTemplateResponse {
  data: TemplateWithVariables[]
  totalCount: number
  hasNextPage: boolean
  hasPreviousPage: boolean
  nextCursor?: string
  previousCursor?: string
}

export async function getTemplates({
  cursor,
  limit = 10,
  search,
}: GetTemplatesOptions = {}): Promise<PaginatedTemplateResponse> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const where = {
      userId: user.id,
      ...(search && {
        OR: [
          {
            name: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
          {
            content: {
              contains: search,
              mode: 'insensitive' as const,
            },
          },
        ],
      }),
    }

    const take = cursor ? limit + 1 : limit
    const skip = cursor ? 1 : 0

    const templates = await prisma.template.findMany({
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

    if (templates.length > limit) {
      hasNextPage = true
      templates.pop()
      nextCursor = templates[templates.length - 1]?.id
    }

    if (cursor) {
      const previousItem = await prisma.template.findMany({
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

    const totalCount = await prisma.template.count({ where })

    return {
      data: templates,
      totalCount,
      hasNextPage,
      hasPreviousPage,
      nextCursor,
      previousCursor,
    }
  } catch (error) {
    console.error("Error fetching templates:", error)
    throw error
  }
}

export async function getTemplateById(id: string): Promise<Template | null> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  if (!id) throw new Error("Template ID is required")

  try {
    const template = await prisma.template.findFirst({
      where: { 
        id,
        userId: user.id
      },
    })

    return template
  } catch (error) {
    console.error("Error fetching template:", error)
    throw error
  }
}