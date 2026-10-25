import { requireArea } from '@/lib/area';
import { getLanguage } from '@/lib/i18n/server';
import { AccountBanner } from '@/components/account-banner';
import { AppLockWatch } from '@/components/app-lock-watch';
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
      {/* Asks this account's own settings whether the window should re-lock on its own. */}
      <AppLockWatch userId={actor.userId} />
    </>
  );
}
