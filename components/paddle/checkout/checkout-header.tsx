import { Button } from '@/components/ui/button';
import { Link } from '@/i18n/routing';
import { ChevronLeft } from 'lucide-react';
import Image from 'next/image';

export function CheckoutHeader() {
  return (
    <div className={'flex gap-4'}>
      <Link href={'/'}>
        <Button variant={'secondary'} className={'h-[32px] bg-[#182222] border-border w-[32px] p-0 rounded-[4px]'}>
          <ChevronLeft />
        </Button>
      </Link>
      <Image src={'/logo.svg'} alt={'Salzier'} width={131} height={28} />
    </div>
  );
}
