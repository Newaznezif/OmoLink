import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { getRepo } from '@/lib/repo';
import { landingFor } from '@/lib/session';
import { Badge, Card, CardBody, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Choose a new password',
  description: 'Set a new password from the link the authentication service sent you.'
};

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow="Account help"
        title="Nothing to reset yet"
        description="Password reset needs a real account, and this site is still running in demo mode with sample accounts. Use the sign-in page to explore."
      >
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                Demo sign in
              </a>
              <a href="/forgot-password" className="underline font-semibold text-clay-700">
                Why reset is unavailable
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

  const client = supabaseServer();
  const {
    data: { user }
  } = await client.auth.getUser();
  // The recovery link is what grants this page; opening it directly proves nothing.
  if (!user) redirect('/sign-in?error=' + encodeURIComponent('Open the reset link from your email to choose a new password.'));

  async function action(formData: FormData) {
    'use server';
    const password = String(formData.get('password') ?? '');
    const repeat = String(formData.get('passwordRepeat') ?? '');
    if (password.length < 8) {
      redirect('/reset-password?error=' + encodeURIComponent('Use at least 8 characters. A long phrase is easier to remember than a short code.'));
    }
    if (password !== repeat) {
      redirect('/reset-password?error=' + encodeURIComponent('The two entries do not match.'));
    }
    const { error } = await supabaseServer().auth.updateUser({ password });
    if (error) {
      redirect('/reset-password?error=' + encodeURIComponent(error.message));
    }
    redirect('/reset-password?message=' + encodeURIComponent('New password saved. You are still signed in on this device.'));
  }

  const profileRow = await getRepo().getProfileByUserId(user.id);

  return (
    <Section
      eyebrow="Account help"
      title="Choose a new password"
      description="You arrived from a reset link, so this device holds a short-lived recovery session. Only the new password is sent, and it is stored as a hash by the authentication service — never as text here."
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
                {profileRow ? 'Continue to your account' : 'Finish your profile'}
              </a>
            </p>
          ) : (
            <form action={action} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-ink-900 mb-1">
                  New password
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
                  Repeat the new password
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
                Save new password
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-ink-500">
            Signed in as {user.email}. If you did not request this reset, change your password and tell an administrator —
            the account’s role and status are set by them, not by this page.
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
