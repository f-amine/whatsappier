import "server-only"
import { cache } from "react"
import { auth } from "@/auth"
import { prisma } from "./db"

export const getCurrentUser = cache(async () => {
  try {
    const session = await auth()
    return session?.user ?? null 
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
})
export const getUserWithSubscription = cache(async () => {
  try {
    const session = await auth()
    
    if (!session?.user?.id) return null
    
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        paddleSubscription: true
      }
    })
    
    return user
  } catch (error) {
    console.error('Error getting user with subscription data:', error)
    return null
  }
})
