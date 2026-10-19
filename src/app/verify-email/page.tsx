import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { Badge, Card, CardBody, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Confirm your email address',
  description: 'Ask OmoNetTab to send the confirmation email again.'
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export default async function VerifyEmailPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  async function action(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      redirect('/verify-email?error=' + encodeURIComponent('Enter the email address you signed up with.'));
    }
    if (!isSupabaseMode()) {
      redirect(
        '/verify-email?error=' +
          encodeURIComponent('Demo mode has no email service and no addresses to confirm, so nothing was sent.')
      );
    }
    const { error } = await supabaseServer().auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=/onboarding` }
    });
    if (error) {
      redirect('/verify-email?error=' + encodeURIComponent(error.message));
    }
    redirect(
      '/verify-email?message=' +
        encodeURIComponent(
          'If that address needs confirming, a new link has been sent by the authentication service. Addresses already confirmed, or with no account, get the same answer here.'
        )
    );
  }

  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow="Account help"
        title="Email confirmation is not part of this build"
        description="OmoNetTab is running with DATA_MODE=demo. Sample accounts are created already signed in, no address is stored for them, and no mail service is configured, so there is nothing to confirm and nothing to resend."
      >
        <Card>
          <CardBody>
            <p className="text-sm text-ink-700">
              When the app runs against a Supabase project with email confirmation switched on, registration sends the
              link and this page resends it.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                Go to sign in
              </a>
              <a href="/register" className="underline font-semibold text-clay-700">
                Register
              </a>
            </div>
            <div className="mt-3">
              <Badge tone="warning">Demo mode</Badge>
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
      eyebrow="Account help"
      title="Confirm your email address"
      description="Until the address is confirmed the account has no profile record, so it cannot sell or inquire. This page asks the authentication service to send the link again."
    >
      {user && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-ink-700">Signed in as {user.email}</span>
              <Badge tone={confirmed ? 'success' : 'warning'}>{confirmed ? 'Address confirmed' : 'Awaiting confirmation'}</Badge>
            </div>
            {confirmed && (
              <p className="mt-2 text-sm text-ink-700">
                Nothing further is needed.{' '}
                <a href="/sign-in" className="underline font-semibold text-clay-700">
                  Go to your account
                </a>
                .
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
                Email address
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
              Resend confirmation email
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-500">
            The authentication service only resends a confirmation link to a session it recognises, so if you are not
            signed in, sign in first and then use this form — or use the password reset instead. If a link never arrives
            even after a resend, the project’s mail settings — not OmoNetTab — are the place to look. An administrator can
            also confirm an account directly in the authentication provider.
          </p>
          <p className="mt-2 text-sm">
            <a href="/forgot-password" className="underline font-semibold text-clay-700">
              Forgot your password instead?
            </a>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
