import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { ArrangementCard } from '@/components/arrangement-card';
import { ReviewForm } from '@/components/review-form';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export default async function BuyerInquiryPage({ params }: { params: { id: string } }) {
  const actor = await requireArea('/buyer', ['buyer']);
  const repo = getRepo();
  const inquiry = await repo.getInquiry(params.id);
  // Ownership is checked against the stored record, not against what the URL says.
  if (!inquiry || inquiry.buyerProfileId !== actor.profileId) notFound();

  const [listing, reviews] = await Promise.all([repo.getListing(inquiry.listingId), repo.listReviews({ listingId: inquiry.listingId, includeHidden: true })]);
  const alreadyReviewed = reviews.some((r) => r.inquiryId === inquiry.id && r.authorProfileId === actor.profileId);
  const completed = inquiry.status === 'completed';

  return (
    <Section
      eyebrow="My account"
      title={`Inquiry ${inquiry.reference}`}
      description="The full record of this request: what you sent, what each side has noted, and the estimate the listing price came to."
    >
      <ArrangementCard inquiry={inquiry} listing={listing} canAct={actor.status === 'active'} showHistory />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What was asked for</h2>
          <dl className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Reply to me at</dt>
              <dd className="text-ink-900 break-words">{inquiry.buyerContact}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Name given</dt>
              <dd className="text-ink-900">{inquiry.buyerName}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Estimated subtotal</dt>
              <dd className="text-ink-900">{formatMoney({ cents: inquiry.estimatedSubtotalCents, currency: inquiry.currency })}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Sent</dt>
              <dd className="text-ink-900">{new Date(inquiry.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-500">
            The estimate was computed on the server from the listing’s unit price at the time you sent the request. It is
            not an invoice and no payment is taken here.
          </p>
        </CardBody>
      </Card>

      {completed ? (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-ink-900">Leave a review</h2>
              <Badge tone="success">completed</Badge>
            </div>
            {alreadyReviewed ? (
              <p className="mt-2 text-sm text-ink-700">
                You have already reviewed this arrangement.{' '}
                {listing && (
                  <Link href={`/listings/${listing.id}`} className="underline font-semibold text-clay-700">
                    See what it looks like on the listing page
                  </Link>
                )}
              </p>
            ) : actor.status === 'suspended' ? (
              <p className="mt-2 text-sm text-ink-700">
                A suspended account cannot post a review. Ask an administrator to reactivate the account first.
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-700">
                  Say how the goods or the visit actually went. Reviews are stored as published and an administrator can
                  hide one that breaks the guidelines, with the reason recorded.
                </p>
                <div className="mt-3">
                  <ReviewForm listingId={inquiry.listingId} inquiryId={inquiry.id} listingTitle={listing?.title ?? 'this listing'} />
                </div>
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Not a sale yet</h2>
            <p className="mt-2 text-sm text-ink-700">
              This record is still being arranged, so no review can be written against it and nothing is counted as
              completed. Use the buttons above only when the goods were delivered or the visit took place.
            </p>
          </CardBody>
        </Card>
      )}

      <p className="text-sm">
        <Link href="/buyer/inquiries" className="underline font-semibold text-clay-700">
          Back to all inquiries
        </Link>
      </p>
    </Section>
  );
}
