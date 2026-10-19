import { redirect } from 'next/navigation';
import { getSessionActor, landingFor, writeSession } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';
import { makeId } from '@/lib/ids';
import { roleForNewAccount, selfServiceAccountKind, type LanguageCode, type Profile } from '@/lib/types';
import { RegisterForm } from '@/components/register-form';
import { Section, Card, CardBody } from '@/components/ui';

export const dynamic = 'force-dynamic';

function fail(message: string): never {
  redirect(`/register?error=${encodeURIComponent(message)}`);
}

export default async function RegisterPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  const actor = await getSessionActor();
  if (actor) redirect(landingFor(actor.role));
  const demo = isDemoMode();

  async function action(formData: FormData) {
    'use server';
    const displayName = String(formData.get('displayName') ?? '').trim();
    const accountKind = selfServiceAccountKind(formData.get('accountKind'));
    const producerType = String(formData.get('producerType') ?? 'other') as Profile['producerType'];
    const community = String(formData.get('community') ?? '').trim();
    const operatingArea = String(formData.get('operatingArea') ?? '').trim();
    const preferredLanguage = String(formData.get('preferredLanguage') ?? 'en') as LanguageCode;
    const shortBio = String(formData.get('shortBio') ?? '').trim();
    const organizationName = String(formData.get('organizationName') ?? '').trim();
    const categories = formData.getAll('categories').map(String).filter(Boolean);
    const consent = formData.get('consent') === 'on';

    if (!displayName || !community || !operatingArea || !shortBio) fail('Please fill in every required field.');
    if (displayName.length > 120) fail('Names must be 120 characters or fewer.');
    if (!consent) fail('Please record your consent to publish the profile before continuing.');
    if (accountKind === 'business_buyer' && !organizationName) {
      fail('A business account needs the organisation name.');
    }

    const baseProfile = {
      displayName,
      producerType,
      accountKind,
      // Never read from the form: what a new account may become is decided here.
      role: roleForNewAccount(accountKind),
      status: 'active' as const,
      organizationName: organizationName || undefined,
      community,
      operatingArea,
      preferredLanguage,
      contactMethod: { kind: 'in_app' } as const,
      shortBio,
      categories,
      consentToPublish: true,
      verification: 'unverified' as const,
      groupIds: [] as string[],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (isDemoMode()) {
      const userId = `demo_user_${makeId('u').slice(6)}`;
      await getRepo().upsertProfile({
        ...baseProfile,
        id: makeId('prof'),
        userId,
        verificationNote: 'Verification workflow pending pilot design. This is a sample profile created in demo mode.',
        isDemo: true
      });
      writeSession({ userId });
      redirect(landingFor(baseProfile.role));
    }

    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    if (!email || password.length < 6) {
      fail('A valid email and a password of at least 6 characters are required.');
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const { data, error } = await supabaseServer().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback`, data: { display_name: displayName } }
    });
    if (error) fail(error.message);

    if (!data.session) {
      // Honest outcome: the account exists but is not usable until confirmed.
      redirect(
        '/register?message=' +
          encodeURIComponent(
            'Account created. Confirm the address in the email we sent, then sign in to finish your profile.'
          )
      );
    }

    await getRepo().upsertProfile({ ...baseProfile, id: '', userId: data.session.user.id, isDemo: false });
    redirect(landingFor(baseProfile.role));
  }

  const categories = await getRepo().listCategories();

  return (
    <Section
      eyebrow="Register"
      title="Create your OmoNetTab account"
      description="A short form that works on a slow connection. Identity documents are never required. A new account always starts unverified, and only an administrator can change what an account is allowed to do — registering here cannot make you an administrator or a group coordinator."
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
          <form action={action}>
            <RegisterForm categories={categories} mode={demo ? 'demo' : 'supabase'} />
          </form>
        </CardBody>
      </Card>
    </Section>
  );
}
