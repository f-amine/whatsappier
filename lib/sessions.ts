import "server-only"
import { cache } from "react"
import { auth } from "@/auth"

export const getCurrentUser = cache(async () => {
  try {
    const session = await auth()
    return session?.user ?? null 
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
})