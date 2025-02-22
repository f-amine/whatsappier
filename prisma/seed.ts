// prisma/seed.ts
import { PrismaClient } from '@prisma/client'
import { generateAutomations, generateCheckouts, generateConnections, generateDevices, generateOrders, generateTemplates } from './seed-utils'


const prisma = new PrismaClient()

async function clearDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ')

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`)
  } catch (error) {
    console.log({ error })
  }
}

async function main() {
  try {
    // Clear existing data
    await clearDatabase()

    // Create test user
    const user = await prisma.user.create({
      data: {
        name: 'Test User',
        email: 'test@example.com',
        emailVerified: new Date(),
        image: 'https://avatars.githubusercontent.com/u/1234567?v=4',
      },
    })

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

    // Create test subscription and usage data
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

    console.log('Seed data created successfully')
  } catch (error) {
    console.error('Error seeding database:', error)
    throw error
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
