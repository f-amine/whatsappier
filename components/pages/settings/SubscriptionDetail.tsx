'use client';
import { useEffect, useState } from 'react';
import { getSubscription, getTransactions } from '@/lib/mutations/subscriptions';
import { SubscriptionDetailResponse, TransactionResponse } from '@/types/subcscription.types';
import { LoadingScreen } from './LoadingScreen';
import { ErrorContent } from './ErrorConetent';
import { SubscriptionSummary } from './SubscriptionSummary';
import { SubscriptionBilling } from './SubscriptionBilling';

interface Props {
  subscriptionId: string;
}

export function SubscriptionDetail({ subscriptionId }: Props) {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<SubscriptionDetailResponse>();
  const [transactions, setTransactions] = useState<TransactionResponse>();

  useEffect(() => {
    async function fetchData() {
      try {
        const [subscriptionResponse, transactionsResponse] = await Promise.all([
          getSubscription(subscriptionId),
          getTransactions(subscriptionId, ''),
        ]);
        
        setSubscription(subscriptionResponse);
        setTransactions(transactionsResponse);
      } catch (error) {
        console.error('Failed to fetch subscription data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [subscriptionId]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!subscription?.data || !transactions?.data) {
    return <ErrorContent />;
  }

  return (
    <div className="space-y-8">
      <SubscriptionSummary 
        subscription={subscription.data} 
      />
      
      <SubscriptionBilling
        subscription={subscription.data}
        transactions={transactions.data}
        subscriptionId={subscriptionId}
      />
    </div>
  );
}
