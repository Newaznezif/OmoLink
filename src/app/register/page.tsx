import { redirect } from 'next/navigation';
import { getSession, writeSession } from '@/lib/session';
import { getRepo } from '@/lib/repo';
import { makeId } from '@/lib/ids';
import type { LanguageCode, Profile } from '@/lib/types';
import { RegisterForm } from '@/components/register-form';
import { Section, Card, CardBody } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function RegisterPage() {
  const session = getSession();
  if (session) redirect('/dashboard');

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
    const userId = `demo_user_${makeId('u').slice(6)}`;
    const profile: Profile = {
      id: makeId('prof'),
      userId,
      displayName,
      producerType,
      community,
      operatingArea,
      preferredLanguage,
      contactMethod: { kind: 'in_app' },
      shortBio,
      categories,
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: 'Verification workflow pending pilot design. This is a sample profile created in demo mode.',
      groupIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true
    };
    await getRepo().upsertProfile(profile);
    writeSession({ userId, role: 'producer' });
    redirect('/dashboard/profile');
  }

  const categories = await getRepo().listCategories();

  return (
    <Section
      eyebrow="Register"
      title="Create a producer profile"
      description="A short, low-literacy-friendly form. Sensitive identity documents are not required for a demo profile. Only an authorised reviewer can approve verification — creating a profile does not automatically mark it verified."
    >
      <Card>
        <CardBody>
          <form action={action}>
            <RegisterForm categories={categories} />
          </form>
        </CardBody>
      </Card>
    </Section>
  );
}
