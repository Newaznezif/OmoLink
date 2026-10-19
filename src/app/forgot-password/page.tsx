import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { Badge, Card, CardBody, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Forgotten password',
  description: 'Ask OmoNetTab to email a link that lets you choose a new password.'
};

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export default async function ForgotPasswordPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  async function action(formData: FormData) {
    'use server';
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      redirect('/forgot-password?error=' + encodeURIComponent('Enter the email address you signed up with.'));
    }
    if (!isSupabaseMode()) {
      redirect(
        '/forgot-password?error=' +
          encodeURIComponent(
            'This build runs in demo mode: there are no real accounts, no stored passwords and no email service, so nothing can be reset. Demo sign-in picks a sample account instead.'
          )
      );
    }

    const { error } = await supabaseServer().auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`
    });
    if (error) {
      redirect('/forgot-password?error=' + encodeURIComponent(error.message));
    }
    // Deliberately the same answer for an unknown address: this page must not
    // become a way to test which emails have an OmoNetTab account.
    redirect(
      '/forgot-password?message=' +
        encodeURIComponent(
          'If that address has an OmoNetTab account, a reset link is on its way. It expires on the server’s own timetable — check the spam folder if nothing arrives.'
        )
    );
  }

  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow="Account help"
        title="Password reset is not available in this build"
        description="OmoNetTab is running with DATA_MODE=demo. Accounts here are sample records held in memory, there is no password to forget, and no email service is configured — so this page would be a form that lies."
      >
        <Card>
          <CardBody>
            <p className="text-sm text-ink-700">
              Sign in from the demo picker, or set the Supabase environment variables and restart the server to get real
              accounts with real password resets.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                Go to sign in
              </a>
              <a href="/register" className="underline font-semibold text-clay-700">
                Register an account
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

  return (
    <Section
      eyebrow="Account help"
      title="Reset your password"
      description="Tell us the address you registered with and we ask the authentication service to send a reset link. OmoNetTab never stores a readable password."
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
                Email address
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
              Send reset link
            </button>
          </form>
          <p className="mt-3 text-xs text-ink-500">
            The link opens a page on this site that lets the holder of the link choose a new password. Anyone who can read
            that mailbox can therefore change that account’s password — which is why the address itself is never shown
            publicly on OmoNetTab.
          </p>
          <p className="mt-2 text-sm">
            <a href="/verify-email" className="underline font-semibold text-clay-700">
              Never received the confirmation email?
            </a>
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
