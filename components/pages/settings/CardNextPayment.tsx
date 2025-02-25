import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { parseMoney } from '@/lib/paddle/parse-money';
import { PaymentType, Subscription, Transaction } from '@paddle/paddle-node-sdk';
import dayjs from 'dayjs';
import { CalendarClock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';

function findPaymentMethodDetails(transactions?: Transaction[]) {
  const transactionWithPaymentDetails = transactions?.find((transaction) => transaction.payments[0]?.methodDetails);
  const firstValidPaymentMethod = transactionWithPaymentDetails?.payments[0].methodDetails;
  return firstValidPaymentMethod ? firstValidPaymentMethod : { type: 'unknown' as PaymentType, card: null };
}

interface Props {
  transactions?: Transaction[];
  subscription?: Subscription;
}

export function CardNextPayment({ subscription, transactions }: Props) {
  if (!subscription?.nextBilledAt) {
    return null;
  }
  
  const nextPaymentAmount = parseMoney(
    subscription?.nextTransaction?.details.totals.total,
    subscription?.currencyCode
  );
  
  const nextPaymentDate = dayjs(subscription?.nextBilledAt).format('MMM DD, YYYY');
  
  const { type, card } = findPaymentMethodDetails(transactions);
  const hasPaymentMethod = type !== 'unknown';
  
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-blue-500" />
          Next Payment
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground">Amount Due</span>
            <span className="text-2xl font-bold">{nextPaymentAmount}</span>
          </div>
          
          <div className="flex justify-between items-baseline">
            <span className="text-muted-foreground">Due Date</span>
            <span className="font-medium">{nextPaymentDate}</span>
          </div>
          
          <div className="pt-4 border-t">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="text-muted-foreground">Payment Method</span>
              </div>
              {subscription?.managementUrls?.updatePaymentMethod && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild 
                  className="text-xs h-7 px-2"
                >
                  <a href={subscription.managementUrls.updatePaymentMethod} target="_blank" rel="noopener noreferrer">
                    Update
                  </a>
                </Button>
              )}
            </div>
            
            {hasPaymentMethod ? (
              <div className="bg-muted p-3 rounded-md flex items-center">
                <div className="mr-3">
                  <div className="bg-background rounded-md p-1 shadow-sm">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
                <div>
                  {type === 'card' && card ? (
                    <>
                      <div className="font-medium">
                        {card.type || 'Credit Card'} •••• {card.last4}
                      </div>
                      {card.expiryMonth && card.expiryYear && (
                        <div className="text-xs text-muted-foreground">
                          Expires {card.expiryMonth}/{card.expiryYear}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="font-medium">
                      {type.charAt(0).toUpperCase() + type.slice(1).replace('_', ' ')}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">
                No payment method information available
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
