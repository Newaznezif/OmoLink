import { requireArea } from '@/lib/area';
import { AccountBanner } from '@/components/account-banner';
import { AdminNav } from '@/components/admin-nav';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireArea('/admin', ['admin']);
  return (
    <>
      <AdminNav />
      <div className="space-y-4 pt-4">
        <AccountBanner actor={actor} />
        {children}
      </div>
    </>
  );
}
