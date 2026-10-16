import { redirect } from 'next/navigation';
import { getSessionActor } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { DemoSignInForm } from '@/components/demo-signin-form';
import { CredentialsForm } from '@/components/credentials-form';
import { Section, Card, CardBody } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function SignInPage({ searchParams }: { searchParams: { error?: string } }) {
  const actor = await getSessionActor();
  if (actor) redirect('/dashboard');

  if (!isDemoMode()) {
    return (
      <Section
        eyebrow="Sign in"
        title="Sign in to your producer account"
        description="This instance is connected to a Supabase project, so sign-in uses real credentials and Row Level Security decides what you can see."
      >
        <Card>
          <CardBody>
            <CredentialsForm submitPath="/api/auth/signin" submitLabel="Sign in" />
            {searchParams.error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {searchParams.error}
              </p>
            )}
            <p className="mt-3 text-sm text-ink-500">
              No account yet? <a className="underline font-semibold" href="/register">Register as a producer</a>.
            </p>
          </CardBody>
        </Card>
      </Section>
    );
  }

  const profiles = await getRepo().listPublicProfiles();
  const candidates = profiles.filter((p) => p.id !== 'prof_admin');
  const admin = profiles.find((p) => p.id === 'prof_admin');

  return (
    <Section
      eyebrow="Sign in"
      title="Sign in as a demo account"
      description="Demo mode: sign-in is simulated with clearly labeled demo accounts and a plain cookie. Do not treat it as secure authentication. Real sign-in runs when DATA_MODE=supabase and the Supabase keys are configured."
    >
      <DemoSignInForm
        producers={candidates.map((p) => ({ userId: p.userId, displayName: p.displayName, community: p.community }))}
        admin={admin ? { userId: admin.userId, displayName: admin.displayName } : undefined}
      />
    </Section>
  );
}
