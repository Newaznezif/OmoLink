import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { DemoSignInForm } from '@/components/demo-signin-form';
import { Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function SignInPage() {
  const session = getSession();
  if (session) redirect('/dashboard');
  const repo = getRepo();
  const profiles = await repo.listPublicProfiles();
  const candidates = profiles.filter((p) => p.id !== 'prof_admin');
  const admin = profiles.find((p) => p.id === 'prof_admin');

  return (
    <Section
      eyebrow="Sign in"
      title="Sign in as a demo account"
      description="This build has no real Supabase credentials, so sign-in is simulated with clearly labeled demo accounts. Do not treat the demo session as secure authentication. Real sign-in requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to be configured."
    >
      <DemoSignInForm
        producers={candidates.map((p) => ({ userId: p.userId, displayName: p.displayName, community: p.community }))}
        admin={admin ? { userId: admin.userId, displayName: admin.displayName } : undefined}
      />
    </Section>
  );
}
