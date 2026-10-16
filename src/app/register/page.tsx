import { redirect } from 'next/navigation';
import { getSessionActor, writeSession } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { supabaseServer } from '@/lib/supabase/server';
import { makeId } from '@/lib/ids';
import type { LanguageCode, Profile } from '@/lib/types';
import { RegisterForm } from '@/components/register-form';
import { Section, Card, CardBody } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const actor = await getSessionActor();
  if (actor) redirect('/dashboard');
  const demo = isDemoMode();

  async function action(formData: FormData) {
    'use server';
    const displayName = String(formData.get('displayName') ?? '').trim();
    const producerType = String(formData.get('producerType') ?? 'artisan') as Profile['producerType'];
    const community = String(formData.get('community') ?? '').trim();
    const operatingArea = String(formData.get('operatingArea') ?? '').trim();
    const preferredLanguage = String(formData.get('preferredLanguage') ?? 'en') as LanguageCode;
    const shortBio = String(formData.get('shortBio') ?? '').trim();
    const categories = formData.getAll('categories').map(String).filter(Boolean);
    const consent = formData.get('consent') === 'on';

    if (!displayName || !community || !operatingArea || !shortBio || !consent) {
      return { error: 'Please fill every required field and record consent before continuing.' };
    }

    const baseProfile = {
      displayName,
      producerType,
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
      writeSession({ userId, role: 'producer' });
      redirect('/dashboard/profile');
    }

    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    if (!email || password.length < 6) {
      return { error: 'A valid email and a password of at least 6 characters are required.' };
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
    const { data, error } = await supabaseServer().auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${siteUrl}/auth/callback`, data: { display_name: displayName } }
    });
    if (error) return { error: error.message };

    if (!data.session) {
      // Honest outcome: the account exists but is not usable until confirmed.
      return {
        message: 'Account created. Check your email and confirm the address, then sign in to finish your profile.'
      };
    }

    await getRepo().upsertProfile({ ...baseProfile, id: '', userId: data.session.user.id, isDemo: false });
    redirect('/dashboard/profile');
  }

  const categories = await getRepo().listCategories();

  return (
    <Section
      eyebrow="Register"
      title="Create a producer profile"
      description="A short, low-literacy-friendly form. Sensitive identity documents are not required. Only an authorised reviewer can approve verification — creating a profile never marks it verified automatically."
    >
      <Card>
        <CardBody>
          <form action={action}>
            <RegisterForm categories={categories} mode={demo ? 'demo' : 'supabase'} />
          </form>
        </CardBody>
      </Card>
    </Section>
  );
}
