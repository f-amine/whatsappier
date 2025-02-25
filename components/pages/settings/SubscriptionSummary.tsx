import { Subscription } from '@paddle/paddle-node-sdk';
import { parseMoney } from '@/lib/paddle/parse-money';
import dayjs from 'dayjs';
import Image from 'next/image';
import { Shield, Calendar, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SubscriptionHeaderActionButton } from './SubscriptionHeaderActionButton';
import { SubscriptionAlerts } from './SubsctriptionAlrets';

interface Props {
  subscription: Subscription;
}

export function SubscriptionSummary({ subscription }: Props) {
  const subscriptionItem = subscription.items[0];
  const price = subscriptionItem.quantity * parseFloat(subscription?.recurringTransactionDetails?.totals.total ?? '0');
  const formattedPrice = parseMoney(price.toString(), subscription.currencyCode);
  
  const frequency = subscription.billingCycle.frequency === 1
    ? `/${subscription.billingCycle.interval}`
    : `every ${subscription.billingCycle.frequency} ${subscription.billingCycle.interval}s`;
  
  const startedDate = dayjs(subscription.startedAt).format('MMM DD, YYYY');
  const nextBillingDate = subscription.nextBilledAt 
    ? dayjs(subscription.nextBilledAt).format('MMM DD, YYYY')
    : 'N/A';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'paused': return 'bg-amber-500';
      case 'past_due': return 'bg-red-500';
      case 'canceled': return 'bg-gray-500';
      default: return 'bg-blue-500';
    }
  };

  return (
    <Card className="overflow-hidden">
      <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500" />
      <CardContent className="p-6">
        <SubscriptionAlerts subscription={subscription} />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {subscriptionItem.product.imageUrl && (
              <div className="rounded-lg overflow-hidden border shadow-sm">
                <Image 
                  src={subscriptionItem.product.imageUrl} 
                  alt={subscriptionItem.product.name} 
                  width={64} 
                  height={64}
                  className="object-cover"
                />
              </div>
            )}
            
            <div>
              <h2 className="text-2xl font-bold">{subscriptionItem.product.name}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${getStatusColor(subscription.status)}`}>
                  {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1)}
                </Badge>
                <span className="text-muted-foreground text-sm">
                  ID: {subscription.id.substring(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end gap-1">
            <div className="flex items-baseline">
              <span className="text-3xl font-bold">{formattedPrice}</span>
              <span className="text-muted-foreground ml-1">{frequency}</span>
            </div>
            
            {!(subscription.scheduledChange || subscription.status === 'canceled') && (
              <div className="mt-2">
                <SubscriptionHeaderActionButton subscriptionId={subscription.id} />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Started on:</span>
            <span className="font-medium">{startedDate}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Next billing:</span>
            <span className="font-medium">{nextBillingDate}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Billing cycle:</span>
            <span className="font-medium">
              {subscription.billingCycle.frequency} {subscription.billingCycle.interval}
              {subscription.billingCycle.frequency !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
