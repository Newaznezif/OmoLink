import { redirect } from 'next/navigation';
import { getSessionActor, landingFor, safeNext } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { DemoSignInForm } from '@/components/demo-signin-form';
import { CredentialsForm } from '@/components/credentials-form';
import { Section, Card, CardBody } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams
}: {
  searchParams: { error?: string; next?: string };
}) {
  const next = safeNext(searchParams.next);
  const actor = await getSessionActor();
  if (actor) redirect(next ?? landingFor(actor.role));

  if (!isDemoMode()) {
    return (
      <Section
        eyebrow="Sign in"
        title="Sign in to your account"
        description="This instance is connected to a Supabase project, so sign-in uses real credentials and Row Level Security decides what you can see."
      >
        <Card>
          <CardBody>
            <CredentialsForm submitPath="/api/auth/signin" submitLabel="Sign in" next={next} />
            {searchParams.error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {searchParams.error}
              </p>
            )}
            <p className="mt-3 text-sm text-ink-500">
              No account yet?{' '}
              <a className="underline font-semibold" href="/register">
                Create one
              </a>
              . Forgotten your password?{' '}
              <a className="underline font-semibold" href="/forgot-password">
                Reset it
              </a>
              .
            </p>
          </CardBody>
        </Card>
      </Section>
    );
  }

  // Demo mode only: every account below is sample data made for the walkthrough,
  // so naming them here exposes no real person. listAllProfiles() stays
  // administrator-only in Supabase mode, which is why it is never called there.
  const profiles = await getRepo().listAllProfiles();
  const pick = (p: (typeof profiles)[number]) => ({
    userId: p.userId,
    displayName: p.displayName,
    detail: `${p.accountKind}${p.status === 'suspended' ? ' · suspended' : ''}`
  });

  return (
    <Section
      eyebrow="Sign in"
      title="Sign in as a demo account"
      description="Demo mode: sign-in is simulated with clearly labelled sample accounts and a cookie that stores only a user id. Roles and suspension are read back from the stored profile on every request, so editing the cookie grants nothing. Real sign-in runs when DATA_MODE=supabase and the Supabase keys are configured."
    >
      {searchParams.error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}
      <DemoSignInForm
        selling={profiles.filter((p) => p.role === 'producer' || p.role === 'coordinator').map(pick)}
        buyers={profiles.filter((p) => p.role === 'buyer').map(pick)}
        admins={profiles.filter((p) => p.role === 'admin').map(pick)}
        next={next}
      />
    </Section>
  );
}
