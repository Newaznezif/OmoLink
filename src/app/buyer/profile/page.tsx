import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getT } from '@/lib/i18n/server';
import type { Translator } from '@/lib/i18n';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('nav.myProfile'),
    description: t('buyerProfile.metaDescription')
  };
}

export default async function BuyerProfilePage() {
  const t = getT();
  const actor = await requireArea('/buyer', ['buyer']);
  const repo = getRepo();
  const [profile, reviews, inquiries] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listReviews({ includeHidden: true }),
    repo.listInquiriesForBuyer(actor.profileId)
  ]);
  if (!profile) {
    return (
      <Section eyebrow={t('nav.myAccountAria')} title={t('nav.myProfile')}>
        <Empty
          title={t('buyerProfile.noProfileTitle')}
          body={t('buyerProfile.noProfileBody')}
          action={
            <Link href="/sign-in" className="underline font-semibold text-clay-700">
              {t('buyerProfile.signInAgain')}
            </Link>
          }
        />
      </Section>
    );
  }

  const mine = reviews.filter((r) => r.authorProfileId === profile.id);
  const listingIds = new Set(inquiries.map((i) => i.listingId));

  return (
    <Section
      eyebrow={t('nav.myAccountAria')}
      title={t('nav.myProfile')}
      description={t('buyerProfile.description')}
    >
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink-900">{profile.displayName}</h2>
            <Badge tone="neutral">{profile.accountKind.replace(/_/g, ' ')}</Badge>
            <Badge tone="info">{profile.role}</Badge>
            {profile.status === 'suspended' && <Badge tone="danger">{t('accountSettings.wordSuspended')}</Badge>}
            {profile.isDemo && <Badge tone="warning">{t('buyerProfile.sampleAccountBadge')}</Badge>}
          </div>
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <Line label={t('filter.community')} value={profile.community || t('buyerProfile.notGiven')} />
            <Line label={t('producers.operatingAreaLabel')} value={profile.operatingArea || t('buyerProfile.notGiven')} />
            <Line label={t('producers.preferredLanguageLabel')} value={languageLabel(profile.preferredLanguage, t)} />
            <Line label={t('buyerProfile.organisationLabel')} value={profile.organizationName || t('buyerProfile.notGiven')} />
            <Line label={t('buyerProfile.contactSharedLabel')} value={describeContact(profile.contactMethod, t)} />
            <Line label={t('buyerProfile.memberSinceLabel')} value={new Date(profile.createdAt).toLocaleDateString()} />
            <Line label={t('listing.lastUpdated')} value={new Date(profile.updatedAt).toLocaleString()} />
            <Line
              label={t('buyerProfile.consentLabel')}
              value={profile.consentToPublish ? t('buyerProfile.consentRecorded') : t('buyerProfile.consentNotRecorded')}
            />
          </dl>
          <p className="mt-3 text-sm text-ink-700">{profile.shortBio || t('buyerProfile.bioEmpty')}</p>
          <p className="mt-3 text-sm">
            <Link href="/buyer/settings" className="underline font-semibold text-clay-700">
              {t('buyerProfile.settingsLink')}
            </Link>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('buyerProfile.visibilityTitle')}</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <strong>{t('buyerProfile.visibleSellerLabel')}</strong> {t('buyerProfile.visibleSellerBody')}
            </li>
            <li>
              <strong>{t('buyerProfile.visibleVisitorsLabel')}</strong> {t('buyerProfile.visibleVisitorsBody')}
            </li>
            <li>
              <strong>{t('buyerProfile.visibleAdminLabel')}</strong> {t('buyerProfile.visibleAdminBody')}
            </li>
            <li>
              <strong>{t('buyerProfile.visibleNeverLabel')}</strong> {t('buyerProfile.visibleNeverBody')}
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">{t('buyerProfile.reviewsVisibilityNote')}</p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('buyerProfile.reviewsTitle')}</h2>
          {mine.length === 0 ? (
            <p className="mt-2 text-sm text-ink-700">
              {listingIds.size === 0
                ? t('buyerProfile.noInquiryToReview')
                : t('buyerProfile.noReviewYet')}
            </p>
          ) : (
            <ul className="mt-2 space-y-3 text-sm">
              {mine.map((r) => (
                <li key={r.id} className="border-b border-ink-100 last:border-0 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={r.status === 'published' ? 'success' : 'warning'}>
                      {r.status === 'published' ? t('buyerProfile.statusPublished') : t('buyerProfile.statusHidden')}
                    </Badge>
                    <span className="font-semibold text-ink-900">{r.rating} / 5</span>
                    <span className="text-ink-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="mt-1 text-ink-700">{r.comment}</p>
                  <p className="mt-1 text-xs">
                    <Link href={`/listings/${r.listingId}`} className="underline font-semibold text-clay-700">
                      {t('buyerProfile.onListingPage')}
                    </Link>
                    {r.status === 'hidden' && r.moderationNote
                      ? ` · ${t('buyerProfile.hiddenReviewNote', { note: r.moderationNote })}`
                      : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </Section>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900">{value}</dd>
    </div>
  );
}

function describeContact(method: { kind: string } & Record<string, unknown>, t: Translator): string {
  if (method.kind === 'in_app') return t('buyerProfile.contactInAppOnly');
  if (method.kind === 'none') return t('buyerProfile.contactNothingShared');
  const consent = method.consent === true;
  const value = typeof method.value === 'string' ? method.value : '';
  if (!consent) return t('buyerProfile.contactStoredNotShared');
  return `${method.kind}: ${value}`;
}

function languageLabel(code: string, t: Translator): string {
  if (code === 'en') return t('register.langEnglish');
  if (code === 'am') return t('buyerProfile.langAmharic');
  return t('buyerProfile.langNoTranslation', { code });
}
