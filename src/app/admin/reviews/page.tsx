import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { AdminSection, BackField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select } from '@/components/ui';
import { SampleTag } from '@/components/status-labels';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminReviewsPage({ searchParams }: { searchParams: SearchParams }) {
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
      title="Review moderation"
      description={`Reviews are written by buyers whose arrangement was recorded as completed. ${hidden} of ${reviews.length} ${
        reviews.length === 1 ? 'is' : 'are'
      } hidden from the public listing page. Hiding keeps the record and the reason — it does not delete the buyer’s words.`}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search comment, author or listing
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                <option value="published">Published</option>
                <option value="hidden">Hidden</option>
              </Select>
            </div>
            <div>
              <label htmlFor="rating" className="block text-sm font-semibold text-ink-900 mb-1">
                Rating
              </label>
              <Select id="rating" name="rating" defaultValue={rating}>
                <option value="">Any</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={String(n)}>
                    {n} star{n === 1 ? '' : 's'}
                  </option>
                ))}
              </Select>
            </div>
            <div className="md:col-span-4 flex items-end gap-2">
              <Button type="submit" size="sm">
                Apply
              </Button>
              <Link href="/admin/reviews" className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-11 text-sm font-semibold">
                Clear
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title="No review matches"
          body="Reviews appear once a buyer submits one for a completed arrangement. Nothing here is invented to fill the page."
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
                    <Badge tone={review.status === 'published' ? 'success' : 'warning'}>{review.status}</Badge>
                    <Badge tone="neutral">{review.rating} / 5</Badge>
                    {review.isDemo && <SampleTag />}
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {review.authorName} · {new Date(review.createdAt).toLocaleString()} · producer{' '}
                    {profileById.get(review.producerProfileId)?.displayName ?? review.producerProfileId}
                  </p>
                  <p className="mt-2 text-sm text-ink-700">{review.comment}</p>
                  {review.moderationNote && (
                    <p className="mt-2 text-sm text-ink-700">
                      <span className="font-semibold">Moderation note:</span> {review.moderationNote}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-500">
                    Tied to arrangement {review.inquiryId}. A review cannot be written against an arrangement that was
                    not completed, and only by the buyer on that record.
                  </p>
                </div>

                <form method="post" action="/api/admin/reviews" className="lg:w-72 shrink-0 space-y-2">
                  <BackField path="/admin/reviews" />
                  <input type="hidden" name="reviewId" value={review.id} />
                  <Field label="Note (required to hide)" htmlFor={`note-${review.id}`}>
                    <Input
                      id={`note-${review.id}`}
                      name="note"
                      defaultValue={review.moderationNote ?? ''}
                      placeholder="e.g. Contains a phone number"
                      maxLength={240}
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {review.status === 'published' ? (
                      <Button type="submit" name="status" value="hidden" size="sm" variant="danger">
                        Hide
                      </Button>
                    ) : (
                      <Button type="submit" name="status" value="published" size="sm">
                        Publish again
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
