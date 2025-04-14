import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Transaction } from '@paddle/paddle-node-sdk';
import { parseMoney } from '@/lib/paddle/parse-money';
import dayjs from 'dayjs';
import { Badge } from '@/components/ui/badge';
import { ReceiptIcon } from 'lucide-react';
import { getPaymentReason } from '@/lib/paddle/data-helpers';
import { Link } from '@/i18n/routing';

interface Props {
  subscriptionId: string;
  transactions?: Transaction[];
}

export function CardPaymentHistory({ subscriptionId, transactions }: Props) {
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'completed';
      case 'pending': return 'pending';
      case 'failed': return 'failed';
      default: return 'default_status';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-medium flex items-center gap-2">
          <ReceiptIcon className="h-5 w-5 text-blue-500" />
          Payment History
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {transactions?.slice(0, 3).map((transaction) => {
            const formattedPrice = parseMoney(transaction.details?.totals?.total, transaction.currencyCode);
            const transactionDate = dayjs(transaction.billedAt ?? transaction.createdAt).format('MMM DD, YYYY');
            
            return (
              <div key={transaction.id} className="px-6 py-4 hover:bg-muted/50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium">{formattedPrice}</div>
                    <div className="text-sm text-muted-foreground">{transactionDate}</div>
                  </div>
                  <Badge variant={getStatusVariant(transaction.status)}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {getPaymentReason(transaction.origin)} · {transaction.details?.lineItems[0].product?.name}
                </div>
              </div>
            );
          })}
          
          {(!transactions || transactions.length === 0) && (
            <div className="px-6 py-8 text-center text-muted-foreground">
              No transaction history available
            </div>
          )}
        </div>
      </CardContent>
      <Link href={`/payments/${subscriptionId}`}>
        <CardFooter className="border-t bg-muted/50 py-3">
          View all transactions
        </CardFooter>
      </Link>

    </Card>
  );
}
