'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { revalidatePath } from "next/cache"

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
