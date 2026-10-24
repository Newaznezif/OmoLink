import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { getRepo } from '@/lib/repo';
import { landingFor } from '@/lib/session';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('auth.resetTitle'),
    description: t('auth.resetMetaDescription')
  };
}

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  const t = getT();
  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow={t('auth.accountHelpEyebrow')}
        title={t('auth.resetDemoTitle')}
        description={t('auth.resetDemoDescription')}
      >
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                {t('auth.demoSignInLink')}
              </a>
              <a href="/forgot-password" className="underline font-semibold text-clay-700">
                {t('auth.whyResetUnavailable')}
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

  const client = supabaseServer();
  const {
    data: { user }
  } = await client.auth.getUser();
  // The recovery link is what grants this page; opening it directly proves nothing.
  if (!user) redirect('/sign-in?error=' + encodeURIComponent(t('auth.resetNeedsLink')));

  async function action(formData: FormData) {
    'use server';
    // Must not close over the renderer's translator: a function in the closure
    // cannot be serialized into the client action reference.
    const t = getT();
    const password = String(formData.get('password') ?? '');
    const repeat = String(formData.get('passwordRepeat') ?? '');
    if (password.length < 8) {
      redirect('/reset-password?error=' + encodeURIComponent(t('auth.resetErrorTooShort', { min: 8 })));
    }
    if (password !== repeat) {
      redirect('/reset-password?error=' + encodeURIComponent(t('auth.resetErrorMismatch')));
    }
    const { error } = await supabaseServer().auth.updateUser({ password });
    if (error) {
      redirect('/reset-password?error=' + encodeURIComponent(error.message));
    }
    redirect('/reset-password?message=' + encodeURIComponent(t('auth.resetSaved')));
  }

  const profileRow = await getRepo().getProfileByUserId(user.id);

  return (
    <Section
      eyebrow={t('auth.accountHelpEyebrow')}
      title={t('auth.resetTitle')}
      description={t('auth.resetDescription')}
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
          {searchParams.message ? (
            <p className="text-sm">
              <a
                href={profileRow ? landingFor(profileRow.role) : '/onboarding'}
                className="underline font-semibold text-clay-700"
              >
                {profileRow ? t('auth.continueAccount') : t('auth.finishProfile')}
              </a>
            </p>
          ) : (
            <form action={action} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-ink-900 mb-1">
                  {t('auth.newPasswordLabel')}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="passwordRepeat" className="block text-sm font-semibold text-ink-900 mb-1">
                  {t('auth.repeatPasswordLabel')}
                </label>
                <input
                  id="passwordRepeat"
                  name="passwordRepeat"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-ink-100 bg-white px-3 py-2"
                />
              </div>
              <button type="submit" className="rounded-lg bg-clay-700 px-4 py-2 font-semibold text-white hover:bg-clay-800">
                {t('auth.saveNewPassword')}
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-ink-500">
            {t('auth.resetSignedInAs', { email: user.email ?? '' })}
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
