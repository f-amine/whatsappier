// lib/mutations/templates.ts
'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { revalidatePath } from "next/cache"

export interface CreateTemplateInput {
  name: string
  content: string
  variables: string[]
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  id: string
}

export async function createTemplate(data: CreateTemplateInput) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const template = await prisma.template.create({
      data: {
        userId: user.id,
        name: data.name,
        content: data.content,
        variables: data.variables,
      },
    })

    revalidatePath('/templates')
    return template
  } catch (error) {
    console.error('Error creating template:', error)
    throw new Error('Failed to create template')
  }
}

export async function updateTemplate({ id, ...data }: UpdateTemplateInput) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify the template belongs to the user
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
      data,
    })

    revalidatePath('/templates')
    return updatedTemplate
  } catch (error) {
    console.error('Error updating template:', error)
    throw new Error('Failed to update template')
  }
}

export async function deleteTemplate(templateId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify the template belongs to the user
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
    console.error('Error deleting template:', error)
    throw new Error('Failed to delete template')
  }
}

export async function bulkDeleteTemplates(templateIds: string[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify all templates belong to the user
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
    console.error('Error bulk deleting templates:', error)
    throw new Error('Failed to delete templates')
  }
}