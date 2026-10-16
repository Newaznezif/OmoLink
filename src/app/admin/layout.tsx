import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = getSession();
  if (session?.role !== 'admin') redirect('/sign-in');
  return <>{children}</>;
}
