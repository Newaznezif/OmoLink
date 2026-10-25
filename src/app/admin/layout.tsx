import { requireArea } from '@/lib/area';
import { getLanguage } from '@/lib/i18n/server';
import { AccountBanner } from '@/components/account-banner';
import { AdminNav } from '@/components/admin-nav';
import { AppLockWatch } from '@/components/app-lock-watch';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireArea('/admin', ['admin']);
  const lang = getLanguage();
  return (
    <>
      <AdminNav lang={lang} />
      <div className="space-y-4 pt-4">
        <AccountBanner actor={actor} lang={lang} />
        {children}
      </div>
      {/* The administrator's own lock, and nothing about the site's moderation. */}
      <AppLockWatch userId={actor.userId} />
    </>
  );
}
