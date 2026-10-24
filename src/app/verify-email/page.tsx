import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('auth.verifyTitle'),
    description: t('auth.verifyMetaDescription')
  };
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  const t = getT();
  async function action(formData: FormData) {
    'use server';
    // Must not close over the renderer's translator: a function in the closure
    // cannot be serialized into the client action reference.
    const t = getT();
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      redirect('/verify-email?error=' + encodeURIComponent(t('auth.errorEmailRequired')));
    }
    if (!isSupabaseMode()) {
      redirect('/verify-email?error=' + encodeURIComponent(t('auth.verifyDemoError')));
    }
    const { error } = await supabaseServer().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` }
    });
    if (error) {
      redirect('/verify-email?error=' + encodeURIComponent(error.message));
    }
    redirect('/verify-email?message=' + encodeURIComponent(t('auth.verifySentMessage')));
  }

  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow={t('auth.accountHelpEyebrow')}
        title={t('auth.verifyDemoTitle')}
        description={t('auth.verifyDemoDescription')}
      >
        <Card>
          <CardBody>
            <p className="text-sm text-ink-700">
              {t('auth.verifyDemoBody')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                {t('auth.goToSignIn')}
              </a>
              <a href="/register" className="underline font-semibold text-clay-700">
                {t('nav.register')}
              </a>
            </div>
            <div className="mt-3">
              <Badge tone="warning">{t('auth.demoModeBadge')}</Badge>
            </div>
          </CardBody>
        </Card>
      </Section>
    );
  }

  const {
    data: { user }
  } = await supabaseServer().auth.getUser();
  const confirmed = Boolean(user?.email_confirmed_at);

  return (
    <Section
      eyebrow={t('auth.accountHelpEyebrow')}
      title={t('auth.verifyTitle')}
      description={t('auth.verifyDescription')}
    >
      {user && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-700">{t('auth.signedInAs', { email: user.email ?? '' })}</span>
              <Badge tone={confirmed ? 'success' : 'warning'}>{confirmed ? t('auth.addressConfirmed') : t('auth.awaitingConfirmation')}</Badge>
            </div>
            {confirmed && (
              <p className="mt-2 text-sm text-ink-700">
                {t('auth.nothingFurther')}{' '}
                <a href="/sign-in" className="underline font-semibold text-clay-700">
                  {t('auth.goToAccount')}
                </a>
                {t('auth.punctuation')}
              </p>
            )}
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          {searchParams.error && (
            <div role="alert" className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
              {searchParams.error}
            </div>
          )}
          {searchParams.message && (
            <div className="mb-4 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-100 p-3 text-sm">
              {searchParams.message}
            </div>
          )}
          <form action={action} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('auth.emailAddressLabel')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue={user?.email ?? ''}
                className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              />
            </div>
            <button type="submit" className="rounded-lg bg-clay-700 px-4 py-2 font-semibold text-white hover:bg-clay-800">
              {t('auth.resendConfirmation')}
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-500">
            {t('auth.verifyFootnote')}
          </p>
          <p className="mt-2 text-sm">
            <a href="/forgot-password" className="underline font-semibold text-clay-700">
              {t('auth.forgotInstead')}
            </a>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
