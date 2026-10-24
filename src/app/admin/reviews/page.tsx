import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection, BackField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
  const t = getT();
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const [reviews, listings, profiles] = await Promise.all([
    repo.listReviews({ includeHidden: true }),
    repo.listAllListings(),
    repo.listAllProfiles()
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));

  const q = text('q').trim().toLowerCase();
  const status = text('status');
  const rating = text('rating');

  const rows = reviews.filter((r) => {
    if (status && r.status !== status) return false;
    if (rating && String(r.rating) !== rating) return false;
    if (!q) return true;
    return [r.comment, r.authorName, listingById.get(r.listingId)?.title ?? ''].join(' ').toLowerCase().includes(q);
  });

  const hidden = reviews.filter((r) => r.status === 'hidden').length;

  return (
    <AdminSection
      title={t('reviewModeration.title')}
      description={t('reviewModeration.description', {
        hidden,
        total: reviews.length,
        verb: reviews.length === 1 ? t('reviewModeration.verbIs') : t('reviewModeration.verbAre')
      })}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('reviewModeration.searchLabel')}
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('reports.status')}
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">{t('reports.allOptions')}</option>
                <option value="published">{t('myListings.badgePublished')}</option>
                <option value="hidden">{t('reviewModeration.filterHidden')}</option>
              </Select>
            </div>
            <div>
              <label htmlFor="rating" className="block text-sm font-semibold text-ink-900 mb-1">
                {t('reviewModeration.ratingLabel')}
              </label>
              <Select id="rating" name="rating" defaultValue={rating}>
                <option value="">{t('common.any')}</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={String(n)}>
                    {t(n === 1 ? 'reviewModeration.starOne' : 'reviewModeration.starMany', { count: n })}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button type="submit" size="sm">
                {t('buyerInquiries.apply')}
              </Button>
              <Link href="/admin/reviews" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                {t('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title={t('reviewModeration.emptyTitle')}
          body={t('reviewModeration.emptyBody')}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((review) => (
            <Card key={review.id}>
              <CardBody className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink-900">
                      <Link href={`/listings/${review.listingId}`} className="underline">
                        {listingById.get(review.listingId)?.title ?? review.listingId}
                      </Link>
                    </h3>
                    <Badge tone={review.status === 'published' ? 'success' : 'warning'}>
                      {review.status === 'published' ? t('buyerProfile.statusPublished') : t('buyerProfile.statusHidden')}
                    </Badge>
                    <Badge tone="neutral">{t('reviewModeration.scoreOfFive', { rating: review.rating })}</Badge>
                    {review.isDemo && <SampleTag />}
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {review.authorName} · {new Date(review.createdAt).toLocaleString()} · {t('reviewModeration.producerWord')}{' '}
                    {profileById.get(review.producerProfileId)?.displayName ?? review.producerProfileId}
                  </p>
                  <p className="mt-2 text-sm text-ink-700">{review.comment}</p>
                  {review.moderationNote && (
                    <p className="mt-2 text-sm text-ink-700">
                      <span className="font-semibold">{t('reviewModeration.moderationNote')}</span> {review.moderationNote}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-500">
                    {t('reviewModeration.tieNote', { id: review.inquiryId })}
                  </p>
                </div>

                <form method="post" action="/api/admin/reviews" className="lg:w-72 shrink-0 space-y-2">
                  <BackField path="/admin/reviews" />
                  <input type="hidden" name="reviewId" value={review.id} />
                  <Field label={t('reviewModeration.noteLabel')} htmlFor={`note-${review.id}`}>
                    <Input
                      id={`note-${review.id}`}
                      name="note"
                      defaultValue={review.moderationNote ?? ''}
                      placeholder={t('reviewModeration.notePlaceholder')}
                      maxLength={240}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {review.status === 'published' ? (
                      <Button type="submit" name="status" value="hidden" size="sm" variant="danger">
                        {t('report.hide')}
                      </Button>
                    ) : (
                      <Button type="submit" name="status" value="published" size="sm">
                        {t('reviewModeration.publishAgain')}
                      </Button>
                    )}
                  </div>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </AdminSection>
  );
}
