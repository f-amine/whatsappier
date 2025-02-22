'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { revalidatePath } from "next/cache"
import { TriggerType } from "@prisma/client"

export interface CreateAutomationInput {
  name: string
  description?: string
  connectionId: string
  templateId: string
  deviceId: string
  trigger: TriggerType
  triggerConfig: Record<string, any>
  isActive?: boolean
}

export interface UpdateAutomationInput extends Partial<CreateAutomationInput> {
  id: string
}

export async function createAutomation(data: CreateAutomationInput) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const automation = await prisma.automation.create({
      data: {
        userId: user.id,
        name: data.name,
        description: data.description,
        connectionId: data.connectionId,
        templateId: data.templateId,
        deviceId: data.deviceId,
        trigger: data.trigger,
        triggerConfig: data.triggerConfig,
        isActive: data.isActive ?? true,
      },
    })

    revalidatePath('/automations')
    return automation
  } catch (error) {
    console.error('Error creating automation:', error)
    throw error
  }
}

export async function updateAutomation({ id, ...data }: UpdateAutomationInput) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const automation = await prisma.automation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!automation) {
      throw new Error("Automation not found")
    }

    const updatedAutomation = await prisma.automation.update({
      where: { id },
      data,
    })

    revalidatePath('/automations')
    return updatedAutomation
  } catch (error) {
    console.error('Error updating automation:', error)
    throw error
  }
}

export async function deleteAutomation(id: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const automation = await prisma.automation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    })

    if (!automation) {
      throw new Error("Automation not found")
    }

    await prisma.automation.delete({
      where: { id },
    })

    revalidatePath('/automations')
    return { success: true }
  } catch (error) {
    console.error('Error deleting automation:', error)
    throw error
  }
}

export async function bulkDeleteAutomations(ids: string[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    const automations = await prisma.automation.findMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
    })

    if (automations.length !== ids.length) {
      throw new Error("One or more automations not found")
    }

    await prisma.automation.deleteMany({
      where: {
        id: { in: ids },
        userId: user.id,
      },
    })

    revalidatePath('/automations')
    return { success: true }
  } catch (error) {
    console.error('Error bulk deleting automations:', error)
    throw error
  }
}
