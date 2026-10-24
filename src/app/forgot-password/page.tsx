import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('auth.forgotMetaTitle'),
    description: t('auth.forgotMetaDescription')
  };
}

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export default async function ForgotPasswordPage({
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
      redirect('/forgot-password?error=' + encodeURIComponent(t('auth.errorEmailRequired')));
    }
    if (!isSupabaseMode()) {
      redirect('/forgot-password?error=' + encodeURIComponent(t('auth.forgotDemoError')));
    }

    const { error } = await supabaseServer().auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`
    });
    if (error) {
      redirect('/forgot-password?error=' + encodeURIComponent(error.message));
    }
    // Deliberately the same answer for an unknown address: this page must not
    // become a way to test which emails have an OmoNetTab account.
    redirect('/forgot-password?message=' + encodeURIComponent(t('auth.forgotSentMessage')));
  }

  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow={t('auth.accountHelpEyebrow')}
        title={t('auth.forgotDemoTitle')}
        description={t('auth.forgotDemoDescription')}
      >
        <Card>
          <CardBody>
            <p className="text-sm text-ink-700">
              {t('auth.forgotDemoBody')}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                {t('auth.goToSignIn')}
              </a>
              <a href="/register" className="underline font-semibold text-clay-700">
                {t('auth.registerAccount')}
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

  return (
    <Section
      eyebrow={t('auth.accountHelpEyebrow')}
      title={t('auth.forgotTitle')}
      description={t('auth.forgotDescription')}
    >
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
                className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
              />
            </div>
            <button type="submit" className="rounded-lg bg-clay-700 px-4 py-2 font-semibold text-white hover:bg-clay-800">
              {t('auth.sendResetLink')}
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-500">
            {t('auth.forgotFootnote')}
          </p>
          <p className="mt-2 text-sm">
            <a href="/verify-email" className="underline font-semibold text-clay-700">
              {t('auth.notReceivedConfirmation')}
            </a>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
