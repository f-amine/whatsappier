import { Subscription, Transaction } from '@paddle/paddle-node-sdk';
import { CardNextPayment } from './CardNextPayment';
import { CardPaymentHistory } from './CardPaymentHistory';
import { CardSubscriptionDetails } from './CardSubscriptionDetails';

interface Props {
  subscription: Subscription;
  transactions: Transaction[];
  subscriptionId: string;
}

export function SubscriptionBilling({ subscription, transactions, subscriptionId }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        <CardNextPayment
          subscription={subscription} 
          transactions={transactions} 
        />
        <CardPaymentHistory
          subscriptionId={subscriptionId} 
          transactions={transactions} 
        />
      </div>
      <div className="lg:col-span-2">
        <CardSubscriptionDetails subscription={subscription} />
      </div>
    </div>
  );
}
