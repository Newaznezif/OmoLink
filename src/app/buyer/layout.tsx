import { requireArea } from '@/lib/area';
import { getLanguage } from '@/lib/i18n/server';
import { AccountBanner } from '@/components/account-banner';
import { BuyerNav } from '@/components/buyer-nav';

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireArea('/buyer', ['buyer']);
  const lang = getLanguage();
  return (
    <>
      <BuyerNav lang={lang} />
      <div className="space-y-4 pt-4">
        <AccountBanner actor={actor} lang={lang} />
        {children}
      </div>
    </>
  );
}
