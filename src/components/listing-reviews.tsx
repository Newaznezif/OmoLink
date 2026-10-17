import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { Badge, Card, CardBody, SampleTag } from './ui';

/**
 * Published reviews for one listing. Hidden ones are simply not read out here —
 * a moderation decision keeps the record but removes it from the public page.
 */
export async function ListingReviews({ listingId, producerName }: { listingId: string; producerName: string }) {
  const repo = getRepo();
  const [reviews, inquiries] = await Promise.all([repo.listReviews({ listingId }), repo.listInquiriesForListing(listingId)]);
  const profile = await getSessionProfile();

  // Can this visitor write one? Only the buyer on a completed arrangement, and
  // only once — the repository repeats both checks before anything is stored.
  const mineCompleted = profile
    ? inquiries.filter((i) => i.buyerProfileId === profile.id && i.status === 'completed')
    : [];
  const reviewable = mineCompleted.filter(
    (i) => !reviews.some((r) => r.inquiryId === i.id && r.authorProfileId === profile?.id)
  );

  if (reviews.length === 0) {
    return (
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900 mb-2">Buyer reviews</h2>
          <p className="text-sm text-ink-700">
            No review has been written for this listing yet. Reviews only appear after an arrangement is recorded as
            completed, so an empty list is honest rather than a missing feature.
          </p>
          {reviewable.length > 0 && (
            <p className="mt-2 text-sm">
              <Link href={`/buyer/inquiries/${reviewable[0]!.id}`} className="underline font-semibold text-clay-700">
                You completed an arrangement here — leave a review
              </Link>
            </p>
          )}
        </CardBody>
      </Card>
    );
  }

  const average = reviews.reduce((total, r) => total + r.rating, 0) / reviews.length;

  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-ink-900">Buyer reviews</h2>
          <p className="text-sm text-ink-700">
            <span className="font-black text-ink-900">{average.toFixed(1)}</span> / 5 from {reviews.length}{' '}
            {reviews.length === 1 ? 'review' : 'reviews'}
          </p>
        </div>
        <p className="mt-1 text-xs text-ink-500">
          Each review is tied to one completed arrangement that the reviewer recorded. Averages hide little: read the
          wording, and remember that {producerName} may have other listings with different experiences.
        </p>
        <ul className="mt-3 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className="border-b border-ink-100 last:border-0 pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={r.rating >= 4 ? 'success' : r.rating <= 2 ? 'danger' : 'warning'}>{r.rating} / 5</Badge>
                <span className="font-semibold text-ink-900">{r.authorName}</span>
                <span className="text-xs text-ink-500">{new Date(r.createdAt).toLocaleDateString()}</span>
                {r.isDemo && <SampleTag />}
              </div>
              <p className="mt-1 text-sm text-ink-700">{r.comment}</p>
            </li>
          ))}
        </ul>
        {reviewable.length > 0 && (
          <p className="mt-3 text-sm">
            <Link href={`/buyer/inquiries/${reviewable[0]!.id}`} className="underline font-semibold text-clay-700">
              Add your review of a completed arrangement
            </Link>
          </p>
        )}
      </CardBody>
    </Card>
  );
}
