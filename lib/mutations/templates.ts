'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { revalidatePath } from "next/cache"
import type { Template } from "@prisma/client"

export interface CreateTemplateInput {
  name: string
  content: string
  category: string
  language: string
  variables?: string[]
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export async function createTemplate(data: CreateTemplateInput): Promise<Template> {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      throw new Error("Unauthorized: No user found")
    }

    // First ensure user exists in database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id }
    })

    if (!dbUser) {
      // If user doesn't exist, create them
      await prisma.user.create({
        data: {
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          image: user.image || '',
        }
      })
    }

    // Create the template
    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: data.name,
        content: data.content,
        category: data.category,
        language: data.language,
        variables: data.variables || []
      }
    })

    revalidatePath('/templates')
    return template

  } catch (err) {
    const error = err as Error
    console.log('Template creation failed:', {
      name: error.name,
      message: error.message,
      data: {
        name: data.name,
        category: data.category,
        language: data.language,
        variablesCount: data.variables?.length
      }
    })
    
    throw error
  }
}

export async function updateTemplate({ id, ...data }: UpdateTemplateInput) {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      throw new Error("Unauthorized: No user found")
    }

    const template = await prisma.template.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!template) {
      throw new Error("Template not found")
    }

    const updatedTemplate = await prisma.template.update({
      where: { id },
      data: {
        ...data,
        variables: data.variables || template.variables,
      }
    })

    revalidatePath('/templates')
    return updatedTemplate

  } catch (error) {
    console.log('Template update failed:', error)
    throw error
  }
}

export async function deleteTemplate(templateId: string): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      throw new Error("Unauthorized: No user found")
    }

    const template = await prisma.template.findFirst({
      where: {
        id: templateId,
        userId: user.id,
      },
    })

    if (!template) {
      throw new Error("Template not found")
    }

    await prisma.template.delete({
      where: { id: templateId },
    })

    revalidatePath('/templates')
    return { success: true }

  } catch (error) {
    console.log('Template deletion failed:', error)
    throw error
  }
}

export async function bulkDeleteTemplates(templateIds: string[]): Promise<{ success: boolean }> {
  try {
    const user = await getCurrentUser()
    
    if (!user?.id) {
      throw new Error("Unauthorized: No user found")
    }

    const templates = await prisma.template.findMany({
      where: {
        id: { in: templateIds },
        userId: user.id,
      },
    })

    if (templates.length !== templateIds.length) {
      throw new Error("One or more templates not found")
    }

    await prisma.template.deleteMany({
      where: {
        id: { in: templateIds },
        userId: user.id,
      },
    })

    revalidatePath('/templates')
    return { success: true }

  } catch (error) {
    console.log('Bulk template deletion failed:', error)
    throw error
  }
}