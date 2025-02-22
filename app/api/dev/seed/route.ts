import { NextResponse } from 'next/server'
import { prisma } from "@/lib/db"
import { getCurrentUser } from '@/lib/sessions'
import { 
  generateDevices, 
  generateTemplates, 
  generateConnections, 
  generateAutomations, 
  generateOrders, 
  generateCheckouts 
} from '@/prisma/seed-utils'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Only available in development' }, { status: 403 })
  }

  try {
    const user = await getCurrentUser()
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Generate 10 devices
    const devices = await Promise.all(
      generateDevices(10, user.id).map(device => 
        prisma.device.create({ data: device })
      )
    )
    const deviceIds = devices.map(d => d.id)

    // Generate 20 templates
    const templates = await Promise.all(
      generateTemplates(20, user.id).map(template =>
        prisma.template.create({ data: template })
      )
    )
    const templateIds = templates.map(t => t.id)

    // Generate 15 connections
    const connections = await Promise.all(
      generateConnections(15, user.id, deviceIds).map(connection =>
        prisma.connection.create({ data: connection })
      )
    )
    const connectionIds = connections.map(c => c.id)

    // Generate 30 automations
    await Promise.all(
      generateAutomations(30, user.id, connectionIds, templateIds, deviceIds).map(automation =>
        prisma.automation.create({ data: automation })
      )
    )

    // Generate 50 orders
    await Promise.all(
      generateOrders(50, connectionIds).map(order =>
        prisma.order.create({ data: order })
      )
    )

    // Generate 50 checkouts
    await Promise.all(
      generateCheckouts(50, connectionIds).map(checkout =>
        prisma.checkout.create({ data: checkout })
      )
    )

    // Create test subscription
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan: 'PRO',
        messageQuota: 10000,
        metadata: {
          features: ['unlimited_devices', 'api_access']
        }
      }
    })

    // Create test usage data
    await prisma.usage.create({
      data: {
        subscriptionId: subscription.id,
        messagesSent: 1234,
        connectionsUsed: devices.length,
        quotaLeft: 8766,
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
      }
    })

    // Create test analytics
    await prisma.analytics.create({
      data: {
        userId: user.id,
        messagesSent: 1234,
        deliveryRate: 98.5,
        failureRate: 1.5,
        metadata: {
          deviceStats: Object.fromEntries(
            devices.map(device => [
              device.id,
              {
                sent: Math.floor(Math.random() * 1000),
                delivered: Math.floor(Math.random() * 900)
              }
            ])
          )
        },
        periodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        periodEnd: new Date()
      }
    })

    return NextResponse.json({
      message: 'Test data created successfully',
      stats: {
        devices: devices.length,
        templates: templates.length,
        connections: connections.length,
        automations: 30,
        orders: 50,
        checkouts: 50
      }
    })

  } catch (error) {
    console.error('Error creating test data:', error)
    return NextResponse.json(
      { error: 'Failed to create test data' },
      { status: 500 }
    )
  }
}
