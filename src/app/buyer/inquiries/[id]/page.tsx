import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { paymentEligibility } from '@/lib/payments';
import { getLanguage, getT } from '@/lib/i18n/server';
import { receiptLabelKey } from '@/lib/receipts';
import { ArrangementCard } from '@/components/arrangement-card';
import { PaymentPanel } from '@/components/payment-panel';
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

  const [listing, reviews, payments] = await Promise.all([
    repo.getListing(inquiry.listingId),
    repo.listReviews({ listingId: inquiry.listingId, includeHidden: true }),
    repo.listPaymentsForInquiry(inquiry.id)
  ]);
  const alreadyReviewed = reviews.some((r) => r.inquiryId === inquiry.id && r.authorProfileId === actor.profileId);
  const completed = inquiry.status === 'completed';

  const eligibility = paymentEligibility({ inquiry, actorProfileId: actor.profileId, existing: payments });
  const suspended = actor.status === 'suspended';
  const canPay = eligibility.eligible && !suspended;
  const newestPayment = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const lang = getLanguage();
  const tr = getT();

  return (
    <Section
      eyebrow={tr('nav.myAccountAria')}
      title={tr('inquiries.recordTitle', { reference: inquiry.reference })}
      description={tr('buyerInquiries.detailDescription')}
    >
      <ArrangementCard inquiry={inquiry} listing={listing} canAct={actor.status === 'active'} showHistory lang={lang} />

      <Card>
        <CardBody>
          <PaymentPanel
            lang={getLanguage()}
            inquiryId={inquiry.id}
            amountCents={inquiry.estimatedSubtotalCents}
            payments={payments}
            canPay={canPay}
            blockedReason={suspended ? 'suspended' : eligibility.eligible ? undefined : eligibility.reason}
          />
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('receipt.recordHeading')}</h2>
          <p className="mt-2">
            <a href={`/api/inquiries/${inquiry.id}/document`} className="underline font-semibold text-clay-700">
              {tr(receiptLabelKey(newestPayment))}
            </a>
          </p>
          <p className="mt-1 text-xs text-ink-500">{tr('receipt.downloadNote')}</p>
          {payments.length === 0 && <p className="mt-1 text-xs text-ink-500">{tr('payment.notPaidReceipt')}</p>}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('inquiries.askedTitle')}</h2>
          <dl className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">{tr('buyerInquiries.replyToMe')}</dt>
              <dd className="text-ink-900 break-words">{inquiry.buyerContact}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{tr('buyerInquiries.nameGiven')}</dt>
              <dd className="text-ink-900">{inquiry.buyerName}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{tr('inquiry.subtotal')}</dt>
              <dd className="text-ink-900">{formatMoney({ cents: inquiry.estimatedSubtotalCents, currency: inquiry.currency })}</dd>
            </div>
            <div>
              <dt className="text-ink-500">{tr('buyerInquiries.sentLabel')}</dt>
              <dd className="text-ink-900">{new Date(inquiry.createdAt).toLocaleString()}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-ink-500">
            {tr('buyerInquiries.estimateNote')}
          </p>
        </CardBody>
      </Card>

      {completed ? (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-ink-900">{tr('buyerInquiries.reviewHeading')}</h2>
              <Badge tone="success">{tr('inquiries.statusWord.completed')}</Badge>
            </div>
            {alreadyReviewed ? (
              <p className="mt-2 text-sm text-ink-700">
                {tr('buyerInquiries.alreadyReviewed')}{' '}
                {listing && (
                  <Link href={`/listings/${listing.id}`} className="underline font-semibold text-clay-700">
                    {tr('buyerInquiries.seeOnListing')}
                  </Link>
                )}
              </p>
            ) : actor.status === 'suspended' ? (
              <p className="mt-2 text-sm text-ink-700">
                {tr('buyerInquiries.suspendedReview')}
              </p>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink-700">
                  {tr('buyerInquiries.reviewIntro')}
                </p>
                <div className="mt-3">
                  <ReviewForm lang={lang} listingId={inquiry.listingId} inquiryId={inquiry.id} listingTitle={listing?.title ?? tr('reviewForm.thisListing')} />
                </div>
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{tr('buyerInquiries.notYetHeading')}</h2>
            <p className="mt-2 text-sm text-ink-700">
              {tr('buyerInquiries.notYetBody')}
            </p>
          </CardBody>
        </Card>
      )}

      <p className="text-sm">
        <Link href="/buyer/inquiries" className="underline font-semibold text-clay-700">
          {tr('inquiries.backToList')}
        </Link>
      </p>
    </Section>
  );
}
