import { requireArea } from '@/lib/area';
import { getLanguage } from '@/lib/i18n/server';
import { AccountBanner } from '@/components/account-banner';
import { AppLockWatch } from '@/components/app-lock-watch';
import { SellerNav } from '@/components/seller-nav';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // A buyer has no selling dashboard and an administrator has an area of their
  // own. Both are refused here for clarity, and again by every page, every route
  // handler, and — in Supabase mode — by Row Level Security.
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const lang = getLanguage();
  return (
    <>
      <SellerNav lang={lang} />
      <div className="space-y-4 pt-4">
        <AccountBanner actor={actor} lang={lang} />
        {children}
      </div>
      <AppLockWatch userId={actor.userId} />
    </>
  );
}
