import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Subscription } from '@paddle/paddle-node-sdk';
import { parseMoney } from '@/lib/paddle/parse-money';
import { PackageIcon } from 'lucide-react';
import Image from 'next/image';

interface Props {
  subscription: Subscription;
}

export function CardSubscriptionDetails({ subscription }: Props) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <PackageIcon className="h-5 w-5 text-blue-500" />
          Subscription Details
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {subscription?.recurringTransactionDetails?.lineItems.map((lineItem, index) => (
            <div key={index} className="grid grid-cols-1 lg:grid-cols-12 gap-4 border-b pb-6 last:border-0 last:pb-0">
              <div className="lg:col-span-7 flex gap-4">
                <div className="flex-shrink-0">
                  {lineItem.product.imageUrl && (
                    <div className="bg-muted p-2 rounded-md border">
                      <Image 
                        src={lineItem.product.imageUrl} 
                        width={48} 
                        height={48} 
                        alt={lineItem.product.name} 
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
                <div className="flex flex-col">
                  <h3 className="font-medium">{lineItem.product.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{lineItem.product.description}</p>
                </div>
              </div>
              
              <div className="lg:col-span-5">
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Quantity</span>
                    <span className="font-medium">{lineItem.quantity}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm text-muted-foreground">Tax Rate</span>
                    <span className="font-medium">{parseFloat(lineItem.taxRate) * 100}%</span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-sm text-muted-foreground">Amount</span>
                    <span className="font-medium">
                      {parseMoney(lineItem.totals.subtotal, subscription?.currencyCode)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="text-muted-foreground">Subtotal</div>
              <div className="text-right font-medium">
                {parseMoney(subscription?.recurringTransactionDetails?.totals.subtotal, subscription?.currencyCode)}
              </div>
              
              <div className="text-muted-foreground">Tax</div>
              <div className="text-right font-medium">
                {parseMoney(subscription?.recurringTransactionDetails?.totals.tax, subscription?.currencyCode)}
              </div>
              
              <div className="text-muted-foreground border-t pt-2">Total (Inc. tax)</div>
              <div className="text-right font-bold border-t pt-2">
                {parseMoney(subscription?.recurringTransactionDetails?.totals.total, subscription?.currencyCode)}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
