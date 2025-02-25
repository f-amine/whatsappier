import { getCurrentUser } from '@/lib/sessions';
import './checkout.css'
import { CheckoutGradients } from '@/components/paddle/checkout/checkout-gradient';
import { CheckoutHeader } from '@/components/paddle/checkout/checkout-header';
import { CheckoutContents } from '@/components/paddle/checkout/checkout-contents';
import { getSubscriptions } from '@/lib/mutations/subscriptions';
import { redirect } from '@/i18n/routing';

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect({ href: '/' ,locale:'en'});
  }

  const { data: subscriptions } = await getSubscriptions();

  if (subscriptions && subscriptions.length > 0) {
    const status = subscriptions[0].status;

    if (status === 'active' || status === 'trialing' || status === 'paused') {
      redirect({ href: '/settings' ,locale:'en'});
    }
  }

  return (
    <div className={'w-full min-h-screen relative overflow-hidden'}>
      <CheckoutGradients />
      <div
        className={'mx-auto max-w-6xl relative px-[16px] md:px-[32px] py-[24px] flex flex-col gap-6 justify-between'}
      >
        <CheckoutHeader />
        <CheckoutContents userEmail={user.email} />
      </div>
    </div>
  );
}
