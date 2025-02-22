'use server'

import { prisma } from "@/lib/db"
import { getCurrentUser } from "@/lib/sessions"
import { OrderStatus, CheckoutStatus } from "@prisma/client"
import { startOfMonth, endOfMonth, subMonths } from "date-fns"

export interface AnalyticsData {
  totalOrders: number
  confirmedOrders: number
  abandonedCheckouts: number
  recoveryRate: number
  monthlyGrowth: {
    orders: number
    confirmed: number
    abandoned: number
    recovery: number
  }
  orderStatusChart: {
    date: string
    confirmed: number
    notConfirmed: number
    inProgress: number
  }[]
  recentOrders: {
    customerName: string
    customerEmail: string
    status: OrderStatus
    createdAt: Date
    connectionName: string // Added this to show which connection the order came from
  }[]
}

export async function getAnalytics(): Promise<AnalyticsData> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new Error("Unauthorized")
  }

  // Get all active connections for the user
  const connections = await prisma.connection.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    select: {
      id: true,
      platform: true,
    },
  })

  const connectionIds = connections.map(c => c.id)

  const currentDate = new Date()
  const startCurrentMonth = startOfMonth(currentDate)
  const endCurrentMonth = endOfMonth(currentDate)
  const startLastMonth = startOfMonth(subMonths(currentDate, 1))
  const endLastMonth = endOfMonth(subMonths(currentDate, 1))

  // Get current month stats across all connections
  const currentMonthStats = await prisma.$transaction([
    prisma.order.count({
      where: {
        connectionId: { in: connectionIds },
        createdAt: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    }),
    prisma.order.count({
      where: {
        connectionId: { in: connectionIds },
        status: OrderStatus.CONFIRMED,
        createdAt: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    }),
    prisma.checkout.count({
      where: {
        connectionId: { in: connectionIds },
        status: CheckoutStatus.ABANDONED,
        createdAt: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    }),
    prisma.checkout.count({
      where: {
        connectionId: { in: connectionIds },
        status: CheckoutStatus.RECOVERED,
        createdAt: {
          gte: startCurrentMonth,
          lte: endCurrentMonth,
        },
      },
    }),
  ])

  // Get last month stats for growth calculation
  const lastMonthStats = await prisma.$transaction([
    prisma.order.count({
      where: {
        connectionId: { in: connectionIds },
        createdAt: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
    }),
    prisma.order.count({
      where: {
        connectionId: { in: connectionIds },
        status: OrderStatus.CONFIRMED,
        createdAt: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
    }),
    prisma.checkout.count({
      where: {
        connectionId: { in: connectionIds },
        status: CheckoutStatus.ABANDONED,
        createdAt: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
    }),
    prisma.checkout.count({
      where: {
        connectionId: { in: connectionIds },
        status: CheckoutStatus.RECOVERED,
        createdAt: {
          gte: startLastMonth,
          lte: endLastMonth,
        },
      },
    }),
  ])

  // Calculate growth percentages
  const calculateGrowth = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current - previous) / previous) * 100
  }

  // Get order status data for chart
  const orderStatusData = await prisma.order.groupBy({
    by: ['createdAt', 'status'],
    where: {
      connectionId: { in: connectionIds },
      createdAt: {
        gte: startCurrentMonth,
        lte: endCurrentMonth,
      },
    },
    _count: true,
  })

  // Transform order status data for chart
  const chartData = Array.from({ length: endCurrentMonth.getDate() }, (_, i) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i + 1)
    const dayData = orderStatusData.filter(d => d.createdAt.getDate() === date.getDate())
    
    return {
      date: date.toISOString(),
      confirmed: dayData.find(d => d.status === OrderStatus.CONFIRMED)?._count ?? 0,
      notConfirmed: dayData.find(d => d.status === OrderStatus.NOT_CONFIRMED)?._count ?? 0,
      inProgress: dayData.find(d => d.status === OrderStatus.IN_PROGRESS)?._count ?? 0,
    }
  })

  // Get recent orders
  const recentOrders = await prisma.order.findMany({
    where: {
      connectionId: { in: connectionIds },
    },
    select: {
      customerName: true,
      customerEmail: true,
      status: true,
      createdAt: true,
      connection: {
        select: {
          platform: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 5,
  })

  // Calculate recovery rate
  const recoveryRate = currentMonthStats[3] > 0 
    ? (currentMonthStats[3] / (currentMonthStats[2] + currentMonthStats[3])) * 100 
    : 0

  return {
    totalOrders: currentMonthStats[0],
    confirmedOrders: currentMonthStats[1],
    abandonedCheckouts: currentMonthStats[2],
    recoveryRate,
    monthlyGrowth: {
      orders: calculateGrowth(currentMonthStats[0], lastMonthStats[0]),
      confirmed: calculateGrowth(currentMonthStats[1], lastMonthStats[1]),
      abandoned: calculateGrowth(currentMonthStats[2], lastMonthStats[2]),
      recovery: calculateGrowth(recoveryRate, 
        lastMonthStats[3] > 0 
          ? (lastMonthStats[3] / (lastMonthStats[2] + lastMonthStats[3])) * 100 
          : 0),
    },
    orderStatusChart: chartData,
    recentOrders: recentOrders.map(order => ({
      ...order,
      connectionName: order.connection.platform,
    })),
  }
}
