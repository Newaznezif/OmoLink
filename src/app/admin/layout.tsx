import { redirect } from 'next/navigation';
import { getSessionActor } from '@/lib/session';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await getSessionActor();
  if (actor?.role !== 'admin') redirect('/sign-in');
  return <>{children}</>;
}
