import { redirect } from 'next/navigation';
import { getSessionActor, landingFor, safeNext } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { canSignInAsDemo, isDemoMode } from '@/lib/store';
import { DemoSignInForm } from '@/components/demo-signin-form';
import { CredentialsForm } from '@/components/credentials-form';
import { Section, Card, CardBody } from '@/components/ui';
import { getLanguage, getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function SignInPage({
  searchParams
}: {
  searchParams: { error?: string; next?: string };
}) {
  const t = getT();
  const lang = getLanguage();
  const next = safeNext(searchParams.next);
  const actor = await getSessionActor();
  if (actor) redirect(next ?? landingFor(actor.role));

  if (!isDemoMode()) {
    return (
      <Section
        eyebrow={t('auth.signInEyebrow')}
        title={t('auth.signInLiveTitle')}
        description={t('auth.signInLiveDescription')}
      >
        <Card>
          <CardBody>
            <CredentialsForm lang={lang} submitPath="/api/auth/signin" submitLabel={t('nav.signIn')} next={next} />
            {searchParams.error && (
              <p role="alert" className="mt-3 text-sm text-red-700">
                {searchParams.error}
              </p>
            )}
            <p className="mt-3 text-sm text-ink-500">
              {t('auth.noAccountYet')}{' '}
              <a className="underline font-semibold" href="/register">
                {t('auth.createOne')}
              </a>
              {t('auth.punctuation')}{' '}
              {t('auth.forgottenPassword')}{' '}
              <a className="underline font-semibold" href="/forgot-password">
                {t('auth.resetIt')}
              </a>
              {t('auth.punctuation')}{' '}
              {t('auth.noConfirmation')}{' '}
              <a className="underline font-semibold" href="/verify-email">
                {t('auth.resendIt')}
              </a>
              {t('auth.punctuation')}
            </p>
          </CardBody>
        </Card>
      </Section>
    );
  }

  // Demo mode only: every account below is sample data made for the walkthrough,
  // so naming them here exposes no real person. listAllProfiles() stays
  // administrator-only in Supabase mode, which is why it is never called there.
  // The same rule the session endpoint enforces is applied here, so the picker
  // can never offer an account that would be refused — the real pilot sellers
  // have public listing pages but no demo sign-in.
  const profiles = (await getRepo().listAllProfiles()).filter((p) => canSignInAsDemo(p.userId));
  const pick = (p: (typeof profiles)[number]) => ({
    userId: p.userId,
    displayName: p.displayName,
    detail: `${p.accountKind}${p.status === 'suspended' ? ' · suspended' : ''}`
  });

  return (
    <Section
      eyebrow={t('auth.signInEyebrow')}
      title={t('auth.signInDemoTitle')}
      description={t('auth.signInDemoDescription')}
    >
      {searchParams.error && (
        <p role="alert" className="mb-3 text-sm text-red-700">
          {searchParams.error}
        </p>
      )}
      <DemoSignInForm
        lang={lang}
        selling={profiles.filter((p) => p.role === 'producer' || p.role === 'coordinator').map(pick)}
        buyers={profiles.filter((p) => p.role === 'buyer').map(pick)}
        admins={profiles.filter((p) => p.role === 'admin').map(pick)}
        next={next}
      />
    </Section>
  );
}
