'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { cache } from "react"

export const fetchConnections = cache(async () => {
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }

  return prisma.connection.findMany({
    where: { 
      userId: user.id,
      isActive: true 
    },
    select: {
      id: true,
      platform: true
    }
  })
})

export const fetchTemplates = cache(async () => {
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }

  return prisma.template.findMany({
    where: { 
      userId: user.id 
    },
    select: {
      id: true,
      name: true
    }
  })
})

export const fetchDevices = cache(async () => {
  const user = await getCurrentUser()
  
  if (!user) {
    return []
  }

  return prisma.device.findMany({
    where: { 
      userId: user.id,
      status: 'CONNECTED' 
    },
    select: {
      id: true,
      name: true
    }
  })
})
