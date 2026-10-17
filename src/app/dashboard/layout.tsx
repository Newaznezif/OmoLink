import { redirect } from 'next/navigation';
import { getSessionActor } from '@/lib/session';
import { AccountBanner } from '@/components/account-banner';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const actor = await getSessionActor();
  if (!actor) redirect('/sign-in');
  // A buyer has no selling dashboard; send them to the area their role owns.
  if (actor.role === 'buyer') redirect('/buyer');
  return (
    <div className="space-y-4">
      <AccountBanner actor={actor} />
      {children}
    </div>
  );
}
