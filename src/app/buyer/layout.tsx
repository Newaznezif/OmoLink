import { requireArea } from '@/lib/area';
import { AccountBanner } from '@/components/account-banner';
import { BuyerNav } from '@/components/buyer-nav';

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireArea('/buyer', ['buyer']);
  return (
    <>
      <BuyerNav />
      <div className="space-y-4 pt-4">
        <AccountBanner actor={actor} />
        {children}
      </div>
    </>
  );
}
