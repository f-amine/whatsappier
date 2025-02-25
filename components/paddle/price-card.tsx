'use client'

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PricingTier } from './constants';
import { IBillingFrequency } from './billing-frequency';
import { Link } from '@/i18n/routing';
import { Badge } from '@/components/ui/badge';
import { CardTitle, CardDescription } from '@/components/ui/card';
import { CircleCheck } from 'lucide-react';
import { OrangeGradientCard } from '../ui/orange-gradient-card';
import { useContext } from 'react';
import { ModalContext } from '@/components/modals/providers';
import { useSession } from 'next-auth/react';

interface Props {
  loading: boolean;
  frequency: IBillingFrequency;
  priceMap: Record<string, string>;
}

export function PriceCards({ loading, frequency, priceMap }: Props) {
  const { data: session } = useSession();
  const { setShowSignInModal } = useContext(ModalContext);

  const handleGetStarted = (e: React.MouseEvent) => {
    if (!session) {
      e.preventDefault();
      setShowSignInModal(true);
    }
  };
  
  return (
    <div className="isolate mx-auto grid grid-cols-1 gap-8 lg:mx-0 lg:max-w-none lg:grid-cols-3">
      {PricingTier.map((tier) => (
        <div 
          key={tier.id} 
          className={cn(
            "h-full",
            tier.featured ? "scale-105 z-10" : ""
          )}
        >
          <OrangeGradientCard
            variant={tier.featured ? 'accent' : (tier.id === 'starter' ? 'subtle' : 'default')}
            direction={tier.id === 'advanced' ? 'vertical' : 'horizontal'} 
            className="h-full"
            cardClassName="h-full flex flex-col"
            header={
              <div className="space-y-2">
                <Badge 
                  variant={tier.featured ? "default" : "outline"} 
                  className={tier.featured 
                    ? "bg-gradient-to-r from-orange-500 to-amber-400 hover:from-orange-600 hover:to-amber-500 text-white border-none"
                    : "bg-orange-100 text-orange-700 hover:bg-orange-100"
                  }
                >
                  {tier.featured ? "Most Popular" : tier.id.charAt(0).toUpperCase() + tier.id.slice(1)}
                </Badge>
                <CardTitle>{tier.name}</CardTitle>
                <CardDescription>{tier.description}</CardDescription>
                <div className="pt-2">
                  {!loading && priceMap[tier.priceId[frequency.value]] ? (
                    <>
                      <span className="text-3xl font-bold">
                        {priceMap[tier.priceId[frequency.value]].replace(/\.00$/, '')}
                      </span>
                      <span className="text-sm text-muted-foreground">/{frequency.value}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold">Loading...</span>
                  )}
                </div>
              </div>
            }
            footer={
              session ? (
                <Link href={`/checkout/${tier.priceId[frequency.value]}`} className="w-full mt-auto">
                  <Button 
                    className={cn(
                      "w-full",
                      tier.featured 
                        ? "bg-gradient-to-r from-orange-500 to-amber-400 border-none hover:from-orange-600 hover:to-amber-500"
                        : ""
                    )}
                    variant={tier.featured ? "default" : "outline"}
                  >
                    {"Get Started"}
                  </Button>
                </Link>
              ) : (
                <Button 
                  className={cn(
                    "w-full mt-auto",
                    tier.featured 
                      ? "bg-gradient-to-r from-orange-500 to-amber-400 border-none hover:from-orange-600 hover:to-amber-500"
                      : ""
                  )}
                  variant={tier.featured ? "default" : "outline"}
                  onClick={(e) => handleGetStarted(e)}
                >
                  {"Get Started"}
                </Button>
              )
            }
          >
            <div className="flex-1"> 
              <ul className="space-y-2 py-2">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <CircleCheck className="h-4 w-4 text-orange-500" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </OrangeGradientCard>
        </div>
      ))}
    </div>
  );
}
