'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { revalidatePath } from "next/cache"
import { OrderStatus } from "@prisma/client"

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify the order belongs to one of the user's connections
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
        id: orderId,
        connectionId: { in: connectionIds },
      },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    // Update the order status
    const updatedOrder = await prisma.order.update({
      where: { id: orderId },
      data: { 
        status,
        metadata: {
          ...order.metadata,
          statusUpdatedAt: new Date().toISOString(),
          previousStatus: order.status,
        }
      },
    })

    revalidatePath('/orders')
    return updatedOrder
  } catch (error) {
    console.error('Error updating order status:', error)
    throw error
  }
}

export async function deleteOrder(orderId: string) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify the order belongs to one of the user's connections
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
        id: orderId,
        connectionId: { in: connectionIds },
      },
    })

    if (!order) {
      throw new Error("Order not found")
    }

    await prisma.order.delete({
      where: { id: orderId },
    })

    revalidatePath('/orders')
    return { success: true }
  } catch (error) {
    console.error('Error deleting order:', error)
    throw error
  }
}

export async function bulkDeleteOrders(orderIds: string[]) {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  try {
    // First verify all orders belong to the user's connections
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

    const orders = await prisma.order.findMany({
      where: {
        id: { in: orderIds },
        connectionId: { in: connectionIds },
      },
    })

    if (orders.length !== orderIds.length) {
      throw new Error("One or more orders not found")
    }

    await prisma.order.deleteMany({
      where: {
        id: { in: orderIds },
        connectionId: { in: connectionIds },
      },
    })

    revalidatePath('/orders')
    return { success: true }
  } catch (error) {
    console.error('Error bulk deleting orders:', error)
    throw error
  }
}
