import { redirect } from 'next/navigation';
import { isSupabaseMode } from '@/lib/supabase/config';
import { supabaseServer } from '@/lib/supabase/server';
import { getRepo } from '@/lib/repo';
import { landingFor } from '@/lib/session';
import { LANGUAGE_OPTIONS, isLanguageCode, safeLanguageCode } from '@/lib/language';
import { Badge, Card, CardBody, Field, Input, Section, Select, Textarea } from '@/components/ui';
import {
  SELF_SERVICE_ACCOUNT_KINDS,
  roleForNewAccount,
  type AccountKind,
  type LanguageCode,
  type Profile,
  type ProducerType
} from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Finish setting up your account',
  description: 'The last step after confirming your email address: the profile the platform shows.'
};

const KIND_LABELS: Record<AccountKind, string> = {
  tourist: 'Visiting the area, booking experiences',
  individual_buyer: 'Buying as an individual',
  business_buyer: 'Buying for a business (shop, hotel, restaurant, institution)',
  producer: 'Selling my own products or services',
  group_or_cooperative: 'Representing a group or cooperative',
  platform_admin: 'Platform administration'
};

const PRODUCER_TYPES: ProducerType[] = [
  'artisan',
  'farmer',
  'producer_group',
  'cooperative',
  'guide',
  'tourism_operator',
  'household',
  'other'
];

function chosenKind(value: string | undefined): AccountKind | undefined {
  return SELF_SERVICE_ACCOUNT_KINDS.includes(value as AccountKind) ? (value as AccountKind) : undefined;
}

export default async function OnboardingPage({
  searchParams
}: {
  searchParams: { kind?: string; error?: string };
}) {
  async function action(formData: FormData) {
    'use server';
    const kind = chosenKind(String(formData.get('accountKind') ?? ''));
    if (!kind) redirect('/onboarding?error=' + encodeURIComponent('Choose what you came to do first.'));

    const displayName = String(formData.get('displayName') ?? '').trim();
    const community = String(formData.get('community') ?? '').trim();
    const operatingArea = String(formData.get('operatingArea') ?? '').trim();
    const shortBio = String(formData.get('shortBio') ?? '').trim();
    const organizationName = String(formData.get('organizationName') ?? '').trim();
    const producerType = String(formData.get('producerType') ?? 'other') as ProducerType;
    const preferredLanguage = safeLanguageCode(formData.get('preferredLanguage'));
    const categories = formData.getAll('categories').map(String).filter(Boolean);
    const consent = formData.get('consent') === 'on';

    const selling = kind === 'producer' || kind === 'group_or_cooperative';
    const fail = (message: string) => redirect(`/onboarding?kind=${kind}&error=` + encodeURIComponent(message));

    if (!displayName || displayName.length > 120) fail('A display name between 1 and 120 characters is required.');
    if (!community || !operatingArea) fail('Fill in the community and the area — buyers and sellers both need them.');
    // A buyer’s note is optional; a seller’s page without a description is useless to a buyer.
    if (selling && shortBio.length < 20) fail('Describe what you sell in at least 20 characters.');
    if (shortBio.length > 1200) fail('Keep the description under 1200 characters.');
    if (kind === 'business_buyer' && !organizationName) fail('A business account needs the organisation name.');
    if (kind === 'group_or_cooperative' && !organizationName) fail('A group account needs the group or cooperative name.');
    if (!consent) fail('Record your consent to publish the profile before continuing.');
    if (!isLanguageCode(preferredLanguage)) fail('Choose one of the listed interface languages.');

    const {
      data: { user }
    } = await supabaseServer().auth.getUser();
    if (!user) redirect('/sign-in?next=/onboarding');

    const repo = getRepo();
    const existing = await repo.getProfileByUserId(user.id);
    if (existing) redirect(landingFor(existing.role));

    const role = roleForNewAccount(kind);
    const created = await repo.upsertProfile({
      id: '',
      userId: user.id,
      displayName,
      producerType: selling ? producerType : 'other',
      // Never taken from the request body: the kind chosen above decides the power.
      role,
      accountKind: kind,
      organizationName: organizationName || undefined,
      status: 'active',
      community,
      operatingArea,
      preferredLanguage,
      contactMethod: { kind: 'in_app' },
      shortBio,
      categories: selling ? categories : [],
      consentToPublish: true,
      verification: 'unverified',
      verificationNote: selling
        ? 'A new selling account always starts unverified. Only an administrator can change that.'
        : undefined,
      groupIds: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: false
    });

    redirect(landingFor(created.role));
  }

  if (!isSupabaseMode()) {
    return (
      <Section
        eyebrow="Account"
        title="Onboarding happens during registration in this build"
        description="Demo mode creates the profile in the same step as the account, so there is no unfinished account to onboard. This page exists for the Supabase build, where email confirmation splits registration into two steps."
      >
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="/register" className="underline font-semibold text-clay-700">
                Register a demo account
              </a>
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                Demo sign in
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
  if (!user) redirect('/sign-in?next=/onboarding');
  const existing = await getRepo().getProfileByUserId(user.id);
  if (existing) redirect(landingFor(existing.role));

  const kind = chosenKind(searchParams.kind);
  const categories = await getRepo().listCategories();
  const selling = kind === 'producer' || kind === 'group_or_cooperative';

  return (
    <Section
      eyebrow="Account"
      title="Finish setting up your account"
      description={`Signed in as ${user.email}. Two short questions, then the profile. No identity document, no document number and no licence copy is collected here — a basic account never needs them, and OmoNetTab does not store them.`}
    >
      {searchParams.error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
          {searchParams.error}
        </div>
      )}

      {!kind ? (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">What brought you to OmoNetTab?</h2>
            <p className="mt-1 text-sm text-ink-700">
              This decides which fields you are asked for and which dashboard you land on. It cannot make you an
              administrator: that power is assigned to an existing account by another administrator or by a database
              provisioning step, never by a form.
            </p>
            <ul className="mt-3 space-y-2">
              {SELF_SERVICE_ACCOUNT_KINDS.map((option) => (
                <li key={option}>
                  <a
                    href={`/onboarding?kind=${option}`}
                    className="block rounded-lg border border-ink-100 bg-white px-4 py-3 font-semibold hover:bg-clay-50"
                  >
                    {KIND_LABELS[option]} <span className="text-ink-500 font-normal">→</span>
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <h2 className="font-semibold text-ink-900">{KIND_LABELS[kind]}</h2>
              <a href="/onboarding" className="text-sm underline text-ink-500">
                choose a different one
              </a>
            </div>
            <form action={action} className="space-y-4">
              <input type="hidden" name="accountKind" value={kind} />

              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label={selling ? 'Your name or the group name' : 'Name you want people to see'}
                  htmlFor="displayName"
                  required
                >
                  <Input id="displayName" name="displayName" required maxLength={120} />
                </Field>
                {(kind === 'business_buyer' || kind === 'group_or_cooperative') && (
                  <Field label={kind === 'group_or_cooperative' ? 'Group or cooperative name' : 'Organisation name'} htmlFor="organizationName" required>
                    <Input id="organizationName" name="organizationName" required maxLength={120} />
                  </Field>
                )}
                <Field label="Community or town" htmlFor="community" required hint="Text only — no exact coordinates are stored.">
                  <Input id="community" name="community" required maxLength={120} />
                </Field>
                <Field
                  label={selling ? 'Where buyers collect from you' : 'Where you usually are'}
                  htmlFor="operatingArea"
                  required
                >
                  <Input id="operatingArea" name="operatingArea" required maxLength={160} />
                </Field>
              </div>

              {selling && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label="What kind of work you do" htmlFor="producerType" required>
                    <Select id="producerType" name="producerType" defaultValue="artisan">
                      {PRODUCER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Interface language" htmlFor="preferredLanguage" hint="Saved as your preference. Pages say which languages still have no reviewed wording.">
                    <Select id="preferredLanguage" name="preferredLanguage" defaultValue="en">
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.code} value={option.code}>
                          {option.english} ({option.native})
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              )}

              <Field
                label={selling ? 'What you sell, in a few sentences' : 'What you are looking for (optional)'}
                htmlFor="shortBio"
                hint={selling ? 'Shown on your public seller page and beside your listings. 20 characters minimum.' : 'Sellers see this when you send an inquiry.'}
                required={selling}
              >
                <Textarea id="shortBio" name="shortBio" maxLength={1200} />
              </Field>

              {selling && (
                <fieldset>
                  <legend className="text-sm font-semibold text-ink-900 mb-1">Categories you work in</legend>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {categories.map((c) => (
                      <label key={c.id} className="flex gap-2 items-center text-sm rounded-lg border border-ink-100 px-3 py-2">
                        <input type="checkbox" name="categories" value={c.id} className="w-4 h-4" />
                        <span>{c.name}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              <Field label="Contact method" htmlFor="contactMethod" hint="Basic accounts start with in-app inquiries only.">
                <Input id="contactMethod" value="In-app inquiry" readOnly />
              </Field>

              <label className="flex gap-2 items-start text-sm rounded-lg border border-ink-100 p-3">
                <input type="checkbox" name="consent" className="mt-1 w-4 h-4" required />
                <span>
                  I consent to publishing this profile on OmoNetTab. Cultural knowledge, ceremony details and community
                  imagery are not published by this consent.
                </span>
              </label>

              <button type="submit" className="rounded-lg bg-clay-700 px-4 py-2 font-semibold text-white hover:bg-clay-800">
                Save profile and continue
              </button>
            </form>
            <p className="mt-3 text-xs text-ink-500">
              {selling
                ? 'This account starts unverified with the plain producer permissions. Group powers — opening a collective opportunity or confirming other members’ contributions — are assigned by an administrator.'
                : 'Tourist and customer accounts share the same buying permissions; the label only changes what you are asked for.'}
            </p>
          </CardBody>
        </Card>
      )}
    </Section>
  );
}
