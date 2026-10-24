import Link from 'next/link';
import { requireArea } from '@/lib/area';
import { getRepo } from '@/lib/repo';
import { getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import type { InquiryStatus, VerificationStatus } from '@/lib/types';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

// The status and verification words the badges render. The English entries are
// the lowercase forms the page showed before localization, so the badges stay
// byte-identical in English while other languages get real wording.
const STATUS_WORD: Record<InquiryStatus, TranslationKey> = {
  new: 'inquiries.statusWord.new',
  accepted: 'inquiries.statusWord.accepted',
  awaiting_confirmation: 'inquiries.statusWord.awaiting_confirmation',
  fulfillment_arranged: 'inquiries.statusWord.fulfillment_arranged',
  completed: 'inquiries.statusWord.completed',
  cancelled: 'inquiries.statusWord.cancelled'
};

const VERIFICATION_WORD: Record<VerificationStatus, TranslationKey> = {
  verified: 'producerOverview.wordVerified',
  pending_review: 'producerOverview.wordPendingReview',
  unverified: 'producerOverview.wordUnverified'
};

export default async function DashboardHome() {
  const t = getT();
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const profile = await getRepo().getProfile(actor.profileId);
  if (!profile) return null;
  const repo = getRepo();
  const listings = await repo.listListingsByProducer(profile.id);
  const inquiries = await repo.listInquiriesForSeller(profile.id);

  const openInquiries = inquiries.filter((i) => i.status === 'new' || i.status === 'accepted' || i.status === 'awaiting_confirmation');
  const goods = inquiries.filter((i) => i.status !== 'cancelled' && i.status !== 'completed');

  return (
    <Section eyebrow={t('myListings.eyebrow')} title={t('producerOverview.welcome', { name: profile.displayName })}>
      <div className="mb-6 flex flex-wrap gap-3">
        <Link href="/dashboard/listings" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          {t('producerOverview.myListingsLink', { count: listings.length })}
        </Link>
        <Link href="/dashboard/listings/new" className="rounded-lg bg-clay-700 text-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-800">
          {t('myListings.newListing')}
        </Link>
        <Link href="/dashboard/inquiries" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          {t('producerOverview.inquiriesLink', { count: openInquiries.length })}
        </Link>
        <Link href="/dashboard/orders" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          {t('producerOverview.ordersToArrange')}
        </Link>
        <Link href="/dashboard/collective-orders" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          {t('producerOverview.collectiveContributions')}
        </Link>
        <Link href="/dashboard/profile" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          {t('producerOverview.profilePreview')}
        </Link>
        <Link href="/dashboard/settings" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 font-semibold hover:bg-clay-50">
          {t('nav.settings')}
        </Link>
      </div>

      {profile.isDemo && (
        <div className="mb-4 flex items-center gap-2">
          <SampleTag />
          <span className="text-sm text-ink-500">
            {t('producerOverview.demoStoreNote')}
          </span>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('producerOverview.activityTitle')}</h2>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('impact.publishedListings')}</dt>
                <dd className="font-semibold">{listings.filter((l) => l.published).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('producerOverview.draftUnpublished')}</dt>
                <dd className="font-semibold">{listings.filter((l) => !l.published).length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('producerOverview.inquiriesReceived')}</dt>
                <dd className="font-semibold">{inquiries.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('producerOverview.openInquiries')}</dt>
                <dd className="font-semibold">{goods.length}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">{t('producerOverview.estimateSumLabel')}</dt>
                <dd className="font-semibold">
                  {formatMoney({
                    cents: inquiries
                      .filter((i) => i.status !== 'cancelled' && i.status !== 'completed')
                      .reduce((s, i) => s + i.estimatedSubtotalCents, 0),
                    currency: 'ETB'
                  })}
                </dd>
              </div>
            </dl>
            <p className="mt-2 text-xs text-ink-500">
              {t('producerOverview.estimateHonesty')}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('producerOverview.verificationTitle')}</h2>
            <p className="mt-1 text-sm text-ink-700">
              {t('producerOverview.verificationIntro')}
            </p>
            <div className="mt-2">
              <Badge tone={profile.verification === 'verified' ? 'success' : profile.verification === 'pending_review' ? 'warning' : 'neutral'}>
                {t(VERIFICATION_WORD[profile.verification])}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-ink-500">
              {profile.verificationNote ?? t('producerOverview.noVerificationYet')}
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('producerOverview.completenessTitle')}</h2>
            <ul className="mt-2 space-y-1 text-sm">
              <CompletenessRow ok={Boolean(profile.displayName)} label={t('producerOverview.compName')} />
              <CompletenessRow ok={Boolean(profile.community)} label={t('producerOverview.compCommunity')} />
              <CompletenessRow ok={Boolean(profile.shortBio) && profile.shortBio.length >= 40} label={t('producerOverview.compBio')} />
              <CompletenessRow ok={profile.categories.length > 0} label={t('producerOverview.compCategory')} />
              <CompletenessRow ok={listings.some((l) => l.published)} label={t('producerOverview.compListing')} />
              <CompletenessRow ok={Boolean(profile.consentToPublish)} label={t('producerOverview.compConsent')} />
            </ul>
          </CardBody>
        </Card>
      </div>

      {inquiries.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xl font-bold text-ink-900 mb-3">{t('producerOverview.latestInquiries')}</h2>
          <ul className="space-y-2">
            {inquiries.slice(0, 5).map((i) => {
              const listing = listings.find((l) => l.id === i.listingId);
              return (
                <li key={i.id}>
                  <Card>
                    <CardBody>
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <div className="font-semibold">
                          <Link href={`/dashboard/inquiries/${i.id}`} className="underline text-clay-700">
                            {i.reference}
                          </Link>
                        </div>
                        <div className="text-sm text-ink-700">{listing?.title ?? t('inquiries.listingRemoved')}</div>
                      </div>
                      <div className="mt-1 text-sm">
                        {i.quantity} {i.unitOfSale} · {formatMoney({ cents: i.estimatedSubtotalCents, currency: i.currency })} ·{' '}
                        <Badge tone={statusTone(i.status)}>{t(STATUS_WORD[i.status])}</Badge>
                      </div>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {listings.length === 0 && (
        <div className="mt-6">
          <Empty
            title={t('myListings.emptyTitle')}
            body={t('producerOverview.emptyListingsBody')}
            action={
              <Link href="/dashboard/listings/new" className="inline-flex bg-clay-700 text-white font-semibold px-4 py-2 rounded-lg">
                {t('myListings.newListing')}
              </Link>
            }
          />
        </div>
      )}
    </Section>
  );
}

function statusTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'new' || status === 'awaiting_confirmation') return 'warning';
  return 'neutral';
}

function CompletenessRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span aria-hidden className={'w-3 h-3 rounded-full ' + (ok ? 'bg-moss-500' : 'bg-ink-100')} />
      <span className={ok ? 'text-ink-900' : 'text-ink-500'}>{label}</span>
    </li>
  );
}
