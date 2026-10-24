import { redirect } from 'next/navigation';
import { getSessionActor, landingFor, writeSession } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';
import { makeId } from '@/lib/ids';
import { roleForNewAccount, selfServiceAccountKind, type LanguageCode, type Profile } from '@/lib/types';
import { RegisterForm } from '@/components/register-form';
import { Section, Card, CardBody } from '@/components/ui';
import { getLanguage, getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

function fail(message: string): never {
  redirect(`/register?error=${encodeURIComponent(message)}`);
}

export default async function RegisterPage({
  searchParams
}: {
  searchParams: { error?: string; message?: string };
}) {
  const t = getT();
  const lang = getLanguage();
  const actor = await getSessionActor();
  if (actor) redirect(landingFor(actor.role));
  const demo = isDemoMode();

  async function action(formData: FormData) {
    'use server';
    // Must not close over the renderer's translator: a function in the closure
    // cannot be serialized into the client action reference.
    const t = getT();
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

    if (!displayName || !community || !operatingArea || !shortBio) fail(t('register.errorRequiredFields'));
    if (displayName.length > 120) fail(t('register.errorNameTooLong', { max: 120 }));
    if (!consent) fail(t('register.errorConsent'));
    if (accountKind === 'business_buyer' && !organizationName) {
      fail(t('register.errorOrganization'));
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
        verificationNote: 'Sample profile created in demo mode. No verification has been carried out.',
        isDemo: true
      });
      writeSession({ userId });
      redirect(landingFor(baseProfile.role));
    }

    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    if (!email || password.length < 6) {
      fail(t('register.errorEmailPassword', { min: 6 }));
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
        '/register?message=' + encodeURIComponent(t('register.accountCreatedMessage'))
      );
    }

    await getRepo().upsertProfile({ ...baseProfile, id: '', userId: data.session.user.id, isDemo: false });
    redirect(landingFor(baseProfile.role));
  }

  const categories = await getRepo().listCategories();

  return (
    <Section
      eyebrow={t('nav.register')}
      title={t('register.title')}
      description={t('register.description')}
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
            <RegisterForm lang={lang} categories={categories} mode={demo ? 'demo' : 'supabase'} />
          </form>
        </CardBody>
      </Card>
    </Section>
  );
}
