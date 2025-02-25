import {
  CustomerCreatedEvent,
  CustomerUpdatedEvent,
  EventEntity,
  EventName,
  SubscriptionCreatedEvent,
  SubscriptionUpdatedEvent,
} from '@paddle/paddle-node-sdk';
import { prisma } from '@/lib/db';

export class ProcessWebhook {
  async processEvent(eventData: EventEntity) {
    switch (eventData.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
        await this.updateSubscriptionData(eventData);
        break;
      case EventName.CustomerCreated:
      case EventName.CustomerUpdated:
        await this.updateCustomerData(eventData);
        break;
    }
  }

  private async updateSubscriptionData(eventData: SubscriptionCreatedEvent | SubscriptionUpdatedEvent) {
    try {
      const user = await prisma.user.findFirst({
        where: { paddleCustomerId: eventData.data.customerId }
      });

      if (!user) {
        throw new Error(`No user found for Paddle customer ID: ${eventData.data.customerId}`);
      }

      await prisma.paddleSubscription.upsert({
        where: {
          subscriptionId: eventData.data.id
        },
        update: {
          status: eventData.data.status,
          priceId: eventData.data.items[0].price?.id ?? '',
          productId: eventData.data.items[0].price?.productId ?? '',
          scheduledChange: eventData.data.scheduledChange?.effectiveAt,
          paddleCustomerId: eventData.data.customerId,
          currentPeriodEnd: new Date(eventData.data.currentBillingPeriod?.endsAt ?? ''),
        },
        create: {
          subscriptionId: eventData.data.id,
          status: eventData.data.status,
          priceId: eventData.data.items[0].price?.id ?? '',
          productId: eventData.data.items[0].price?.productId ?? '',
          paddleCustomerId: eventData.data.customerId,
          scheduledChange: eventData.data.scheduledChange?.effectiveAt,
          currentPeriodEnd: new Date(eventData.data.currentBillingPeriod?.endsAt ?? ''),
          userId: user.id  // Add this explicit userId field
        },
      });
    } catch (error) {
      console.error('Error updating subscription data:', error);
      throw error;
    }
  }

  private async updateCustomerData(eventData: CustomerCreatedEvent | CustomerUpdatedEvent) {
    try {
      const existingUser = await prisma.user.findFirst({
        where: { email: eventData.data.email }
      });

      if (existingUser) {
        await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            paddleCustomerId: eventData.data.id,
          },
        });
      } else {
        await prisma.user.create({
          data: {
            email: eventData.data.email,
            paddleCustomerId: eventData.data.id,
          },
        });
      }
    } catch (error) {
      console.error('Error updating customer data:', error);
      throw error;
    }
  }
}
