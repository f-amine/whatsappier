'use server';

import { Subscription } from '@paddle/paddle-node-sdk';
import { revalidatePath } from 'next/cache';
import { getPaddleInstance } from '../paddle/get-paddle-instance';
import { getCurrentUser, getUserWithSubscription } from '../sessions';
import { SubscriptionDetailResponse, SubscriptionResponse, TransactionResponse } from '@/types/subcscription.types';
import { ErrorMessage, getErrorMessage, parseSDKResponse } from '../paddle/data-helpers';

const paddle = getPaddleInstance();

interface Error {
  error: string;
}

export async function cancelSubscription(subscriptionId: string): Promise<Subscription | Error> {
  try {
   await getCurrentUser(); 

    const subscription = await paddle.subscriptions.cancel(subscriptionId, { effectiveFrom: 'next_billing_period' });
    if (subscription) {
      revalidatePath('/dashboard/subscriptions');
    }
    return JSON.parse(JSON.stringify(subscription));
  } catch (e) {
    console.log('Error canceling subscription', e);
    return { error: 'Something went wrong, please try again later' };
  }
}

export async function getSubscriptions():Promise <SubscriptionResponse>{
    const user = await getUserWithSubscription()
    
    if (!user?.paddleCustomerId) {
      return {
        data: [],
        hasMore: false,
        totalRecords: 0,
      }
    }

    const subscriptionCollection = getPaddleInstance().subscriptions.list({ customerId: [user.paddleCustomerId], perPage: 20 });
    const subscriptions = await subscriptionCollection.next();
    return {
      data: subscriptions,
      hasMore: subscriptionCollection.hasMore,
      totalRecords: subscriptionCollection.estimatedTotal,
    };
}

export async function getSubscription(subscriptionId: string): Promise<SubscriptionDetailResponse> {
  try {
    const user = await getUserWithSubscription()
    
    if (user?.paddleCustomerId) {
      const subscription = await getPaddleInstance().subscriptions.get(subscriptionId, {
        include: ['next_transaction', 'recurring_transaction_details'],
      });

      return { data: parseSDKResponse(subscription) }; 
    }
     
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return { error: ErrorMessage };
  }
  return { error: ErrorMessage };
}


export async function getTransactions(subscriptionId: string, after: string): Promise<TransactionResponse> {
  try {
    const user = await getUserWithSubscription()
    if (user?.paddleCustomerId) {
      const transactionCollection = getPaddleInstance().transactions.list({
        customerId: [user.paddleCustomerId],
        after: after,
        perPage: 10,
        status: ['billed', 'paid', 'past_due', 'completed', 'canceled'],
        subscriptionId: subscriptionId ? [subscriptionId] : undefined,
      });
      const transactionData = await transactionCollection.next();
      return {
        data: parseSDKResponse(transactionData ?? []),
        hasMore: transactionCollection.hasMore,
        totalRecords: transactionCollection.estimatedTotal,
        error: undefined,
      };
    } else {
      return { data: [], hasMore: false, totalRecords: 0 };
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return getErrorMessage();
  }
}
