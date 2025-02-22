// prisma/seed-utils.ts
import { faker } from '@faker-js/faker'
import { 
  Platform, 
  DeviceStatus, 
  OrderStatus, 
  CheckoutStatus, 
  TriggerType 
} from '@prisma/client'

export const getRandomEnum = <T>(enumObj: T): T[keyof T] => {
  const enumValues = Object.values(enumObj)
  return enumValues[Math.floor(Math.random() * enumValues.length)] as T[keyof T]
}

export const getRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

export const generateDevices = (count: number, userId: string) => {
  return Array.from({ length: count }, (_, index) => ({
    userId,
    name: `Device ${index + 1}`,
    phoneNumber: faker.phone.number({style:'human'}),
    status: getRandomEnum(DeviceStatus),
    metadata: {
      qrcode: null,
      settings: {
        reject_call: faker.datatype.boolean(),
        msg_call: "Sorry, I can't take calls right now",
        groups_ignore: faker.datatype.boolean(),
        always_online: faker.datatype.boolean(),
        read_messages: faker.datatype.boolean(),
        read_status: faker.datatype.boolean(),
      }
    }
  }))
}

export const generateTemplates = (count: number, userId: string) => {
  const categories = ['order_confirmation', 'shipping_update', 'abandoned_cart', 'payment_received']
  const languages = ['en', 'es', 'fr']

  return Array.from({ length: count }, (_, index) => ({
    userId,
    name: `Template ${index + 1}`,
    content: `Hi {{customer_name}}, ${faker.lorem.sentence()}`,
    variables: ['customer_name', 'order_number'],
    category: categories[index % categories.length],
    language: languages[index % languages.length]
  }))
}

export const generateConnections = (count: number, userId: string, deviceIds: string[]) => {
  return Array.from({ length: count }, (_, index) => ({
    userId,
    platform: index % 2 === 0 ? Platform.SHOPIFY : Platform.LIGHTFUNNELS,
    credentials: index % 2 === 0 ? {
      shopUrl: `store-${index}.myshopify.com`,
      adminApiKey: faker.string.uuid(),
    } : {
      accessToken: faker.string.uuid(),
    },
    metadata: {
      connectedAt: faker.date.recent().toISOString(),
      shopData: index % 2 === 0 ? {
        name: faker.company.name(),
        email: faker.internet.email(),
      } : null
    },
    isActive: faker.datatype.boolean(),
    deviceId: deviceIds[index % deviceIds.length]
  }))
}

export const generateAutomations = (
  count: number, 
  userId: string,
  connectionIds: string[],
  templateIds: string[],
  deviceIds: string[]
) => {
  return Array.from({ length: count }, (_, index) => ({
    userId,
    name: `Automation ${index + 1}`,
    description: faker.lorem.sentence(),
    connectionId: connectionIds[index % connectionIds.length],
    templateId: templateIds[index % templateIds.length],
    deviceId: deviceIds[index % deviceIds.length],
    trigger: getRandomEnum(TriggerType),
    triggerConfig: {
      endpoint: `/api/webhooks/automation/${index + 1}`,
      secret: faker.string.uuid()
    },
    isActive: faker.datatype.boolean(),
    metadata: {
      lastRun: faker.date.recent(),
      totalRuns: faker.number.int({ min: 0, max: 1000 })
    }
  }))
}

export const generateOrders = (count: number, connectionIds: string[]) => {
  return Array.from({ length: count }, () => ({
    connectionId: connectionIds[Math.floor(Math.random() * connectionIds.length)],
    customerName: faker.person.fullName(),
    customerEmail: faker.internet.email(),
    status: getRandomEnum(OrderStatus),
    metadata: {
      orderId: `ORD-${faker.string.alphanumeric(8).toUpperCase()}`,
      total: faker.number.float({ min: 10, max: 1000 }),
      currency: 'USD',
      items: Array.from(
        { length: faker.number.int({ min: 1, max: 5 }) },
        () => ({
          name: faker.commerce.productName(),
          quantity: faker.number.int({ min: 1, max: 5 }),
          price: faker.number.float({ min: 10, max: 200})
        })
      ),
      shippingAddress: {
        street: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
        zip: faker.location.zipCode(),
        country: faker.location.country()
      }
    }
  }))
}

export const generateCheckouts = (count: number, connectionIds: string[]) => {
  const lastMonth = new Date()
  lastMonth.setMonth(lastMonth.getMonth() - 1)

  return Array.from({ length: count }, () => {
    const abandonedAt = getRandomDate(lastMonth, new Date())
    const recoveredAt = faker.datatype.boolean() 
      ? new Date(abandonedAt.getTime() + Math.random() * (Date.now() - abandonedAt.getTime()))
      : null

    return {
      connectionId: connectionIds[Math.floor(Math.random() * connectionIds.length)],
      customerName: faker.person.fullName(),
      customerEmail: faker.internet.email(),
      status: getRandomEnum(CheckoutStatus),
      metadata: {
        checkoutId: `CHK-${faker.string.alphanumeric(8).toUpperCase()}`,
        total: faker.number.float({ min: 10, max: 1000}),
        currency: 'USD',
        items: Array.from(
          { length: faker.number.int({ min: 1, max: 5 }) },
          () => ({
            name: faker.commerce.productName(),
            quantity: faker.number.int({ min: 1, max: 5 }),
            price: faker.number.float({ min: 10, max: 200 })
          })
        ),
        abandonedAt: abandonedAt.toISOString(),
        recoveredAt: recoveredAt?.toISOString(),
        lastActivityAt: getRandomDate(abandonedAt, new Date()).toISOString(),
        recoveryMethod: recoveredAt ? 'whatsapp_reminder' : null
      }
    }
  })
}
