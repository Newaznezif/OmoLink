import { redirect } from 'next/navigation';
import { getSessionProfile } from '@/lib/session';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getSessionProfile();
  if (!profile) redirect('/sign-in');
  return <>{children}</>;
}
