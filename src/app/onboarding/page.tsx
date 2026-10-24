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
import { getT } from '@/lib/i18n/server';
import { type TranslationKey } from '@/lib/i18n';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('register.finishTitle'),
    description: t('register.finishMetaDescription')
  };
}

const KIND_LABEL_KEYS: Record<AccountKind, TranslationKey> = {
  tourist: 'register.onbKindTourist',
  individual_buyer: 'register.onbKindIndividual',
  business_buyer: 'register.onbKindBusiness',
  producer: 'register.onbKindProducer',
  group_or_cooperative: 'register.onbKindGroup',
  platform_admin: 'register.onbKindAdmin'
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
  const t = getT();
  async function action(formData: FormData) {
    'use server';
    // Must not close over the renderer's translator: a function in the closure
    // cannot be serialized into the client action reference.
    const t = getT();
    const kind = chosenKind(String(formData.get('accountKind') ?? ''));
    if (!kind) redirect('/onboarding?error=' + encodeURIComponent(t('register.errorChooseKind')));

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

    if (!displayName || displayName.length > 120) fail(t('register.errorDisplayName', { max: 120 }));
    if (!community || !operatingArea) fail(t('register.errorCommunityArea'));
    // A buyer’s note is optional; a seller’s page without a description is useless to a buyer.
    if (selling && shortBio.length < 20) fail(t('register.errorMinBio', { min: 20 }));
    if (shortBio.length > 1200) fail(t('register.errorMaxBio', { max: 1200 }));
    if (kind === 'business_buyer' && !organizationName) fail(t('register.errorOrganization'));
    if (kind === 'group_or_cooperative' && !organizationName) fail(t('register.errorGroupOrganization'));
    if (!consent) fail(t('register.errorConsentNeeded'));
    if (!isLanguageCode(preferredLanguage)) fail(t('register.errorLanguageChoice'));

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
        eyebrow={t('register.eyebrowAccount')}
        title={t('register.onboardingDemoTitle')}
        description={t('register.onboardingDemoDescription')}
      >
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-2 text-sm">
              <a href="/register" className="underline font-semibold text-clay-700">
                {t('register.registerDemoLink')}
              </a>
              <a href="/sign-in" className="underline font-semibold text-clay-700">
                {t('auth.demoSignInLink')}
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
      eyebrow={t('register.eyebrowAccount')}
      title={t('register.finishTitle')}
      description={t('register.onboardingIntro', { email: user.email ?? '' })}
    >
      {searchParams.error && (
        <div role="alert" className="mb-4 rounded-lg bg-red-50 text-red-700 border border-red-100 p-3 text-sm">
          {searchParams.error}
        </div>
      )}

      {!kind ? (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('register.kindHeading')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('register.kindHint')}
            </p>
            <ul className="mt-3 space-y-2">
              {SELF_SERVICE_ACCOUNT_KINDS.map((option) => (
                <li key={option}>
                  <a
                    href={`/onboarding?kind=${option}`}
                    className="block rounded-lg border border-ink-100 bg-white px-4 py-3 font-semibold hover:bg-clay-50"
                  >
                    {t(KIND_LABEL_KEYS[option])} <span className="text-ink-500 font-normal">→</span>
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
              <h2 className="font-semibold text-ink-900">{t(KIND_LABEL_KEYS[kind])}</h2>
              <a href="/onboarding" className="text-sm underline text-ink-500">
                {t('register.chooseDifferent')}
              </a>
            </div>
            <form action={action} className="space-y-4">
              <input type="hidden" name="accountKind" value={kind} />

              <div className="grid md:grid-cols-2 gap-4">
                <Field
                  label={selling ? t('register.displayNameSeller') : t('register.displayNameBuyer')}
                  htmlFor="displayName"
                  required
                >
                  <Input id="displayName" name="displayName" required maxLength={120} />
                </Field>
                {(kind === 'business_buyer' || kind === 'group_or_cooperative') && (
                  <Field label={kind === 'group_or_cooperative' ? t('register.groupNameLabel') : t('register.organizationLabel')} htmlFor="organizationName" required>
                    <Input id="organizationName" name="organizationName" required maxLength={120} />
                  </Field>
                )}
                <Field label={t('register.communityTownLabel')} htmlFor="community" required hint={t('register.communityTownHint')}>
                  <Input id="community" name="community" required maxLength={120} />
                </Field>
                <Field
                  label={selling ? t('register.operatingAreaSeller') : t('register.operatingAreaBuyer')}
                  htmlFor="operatingArea"
                  required
                >
                  <Input id="operatingArea" name="operatingArea" required maxLength={160} />
                </Field>
              </div>

              {selling && (
                <div className="grid md:grid-cols-2 gap-4">
                  <Field label={t('register.workTypeLabel')} htmlFor="producerType" required>
                    <Select id="producerType" name="producerType" defaultValue="artisan">
                      {PRODUCER_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t.replace(/_/g, ' ')}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label={t('common.interfaceLanguage')} htmlFor="preferredLanguage" hint={t('register.interfaceLanguageHint')}>
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
                label={selling ? t('register.bioSellerLabel') : t('register.bioBuyerLabel')}
                htmlFor="shortBio"
                hint={selling ? t('register.bioSellerHint') : t('register.bioBuyerHint')}
                required={selling}
              >
                <Textarea id="shortBio" name="shortBio" maxLength={1200} />
              </Field>

              {selling && (
                <fieldset>
                  <legend className="text-sm font-semibold text-ink-900 mb-1">{t('register.workCategories')}</legend>
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

              <Field label={t('register.contactMethodLabel')} htmlFor="contactMethod" hint={t('register.contactHintOnboarding')}>
                <Input id="contactMethod" value={t('register.contactMethodValue')} readOnly />
              </Field>

              <label className="flex gap-2 items-start text-sm rounded-lg border border-ink-100 p-3">
                <input type="checkbox" name="consent" className="mt-1 w-4 h-4" required />
                <span>
                  {t('register.consentOnboarding')}
                </span>
              </label>

              <button type="submit" className="rounded-lg bg-clay-700 px-4 py-2 font-semibold text-white hover:bg-clay-800">
                {t('register.saveProfile')}
              </button>
            </form>
            <p className="mt-3 text-xs text-ink-500">
              {selling ? t('register.sellingNote') : t('register.buyerNote')}
            </p>
          </CardBody>
        </Card>
      )}
    </Section>
  );
}
