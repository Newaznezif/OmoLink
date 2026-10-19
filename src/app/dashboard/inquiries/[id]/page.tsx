import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import { receiptLabelKey } from '@/lib/receipts';
import { ArrangementCard, arrangementLabel } from '@/components/arrangement-card';
import { PaymentStatusBadge } from '@/components/payment-panel';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { formatMoney } from '@/lib/money';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Inquiry record',
  description: 'One incoming inquiry with its full history and the status controls for the seller.'
};

export default async function SellerInquiryPage({ params }: { params: { id: string } }) {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  // The listing owner is read from stored records, so an id in the URL grants
  // nothing on its own.
  const [mine, requested] = await Promise.all([repo.listInquiriesForSeller(actor.profileId), repo.getInquiry(params.id)]);
  const inquiry = mine.find((i) => i.id === params.id);
  if (!inquiry || !requested) notFound();

  const item = await repo.getListing(inquiry.listingId);
  const closed = inquiry.status === 'completed' || inquiry.status === 'cancelled';
  // Read-only for the seller: the repository returns this record because the
  // policy says the producer of the listing may see it, and no control here can
  // move a payment.
  const payments = await repo.listPaymentsForInquiry(inquiry.id);
  const latestPayment = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const lang = getLanguage();
  const tr = getT();

  return (
    <Section
      eyebrow="Dashboard"
      title={`Inquiry ${inquiry.reference}`}
      description="What the buyer asked for, what each side has recorded, and the status control for this arrangement."
      actions={<Badge tone="neutral">{arrangementLabel(inquiry.status)}</Badge>}
    >
      <ArrangementCard inquiry={inquiry} listing={item} canAct={actor.status === 'active'} showHistory side="seller" />

      {latestPayment && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-semibold text-ink-900">{tr('payment.heading')}</h2>
              <PaymentStatusBadge lang={lang} status={latestPayment.status} isDemo={latestPayment.isDemo} />
            </div>
            <p className="mt-2 text-sm text-ink-700">{tr('payment.referenceLine', { reference: latestPayment.reference })}</p>
            <p className="mt-1 text-sm text-ink-700">
              {tr('payment.amountLine', { amount: formatMoney({ cents: latestPayment.amountCents, currency: latestPayment.currency }) })}
            </p>
            <p className="mt-1 text-xs text-ink-500">{tr('payment.attemptCount', { count: payments.length })}</p>
            {latestPayment.isDemo && <p className="mt-2 text-xs text-ink-500">{tr('payment.simulatedNote')}</p>}
            <p className="mt-2 text-sm text-ink-700">{tr('payment.sellerViewNote')}</p>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('receipt.recordHeading')}</h2>
          <p className="mt-2">
            <a href={`/api/inquiries/${inquiry.id}/document`} className="underline font-semibold text-clay-700">
              {tr(receiptLabelKey(latestPayment))}
            </a>
          </p>
          <p className="mt-1 text-xs text-ink-500">{tr('receipt.downloadNote')}</p>
          <p className="mt-1 text-xs text-ink-500">
            {latestPayment ? tr('payment.sellerViewNote') : tr('payment.notPaidReceipt')}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What was asked for</h2>
          <dl className="mt-2 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">Quantity</dt>
              <dd className="text-ink-900 font-medium">
                {inquiry.quantity} {inquiry.unitOfSale}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Estimate at your listing price</dt>
              <dd className="text-ink-900 font-medium">
                {formatMoney({ cents: inquiry.estimatedSubtotalCents, currency: inquiry.currency })}
              </dd>
            </div>
            <div>
              <dt className="text-ink-500">Delivery preference</dt>
              <dd className="text-ink-900">{inquiry.preference}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Preferred date</dt>
              <dd className="text-ink-900">{inquiry.preferredDate || '—'}</dd>
            </div>
          </dl>
          {item && (
            <p className="mt-2 text-xs text-ink-500">
              The estimate uses your unit price at the moment the request was sent ({formatMoney(item.unitPrice)} per{' '}
              {item.unitOfSale}). Changing the price on the listing now does not change this record.
            </p>
          )}
          <p className="mt-2 text-sm text-ink-700">
            <Link href={`/dashboard/listings/${inquiry.listingId}`} className="underline font-semibold text-clay-700">
              Open the listing this came in on
            </Link>
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Replying to this buyer</h2>
          <p className="mt-2 text-sm text-ink-700">
            {inquiry.buyerName} left <span className="font-semibold break-words">{inquiry.buyerContact}</span> when the
            request was sent, specifically so you can answer it. Use it for this arrangement only — it is not permission
            to add them to a list, and OmoNetTab does not send the message for you.
          </p>
          <p className="mt-2 text-sm text-ink-700">
            {closed
              ? 'This record is closed, so its status can no longer be changed. If something else is agreed, ask for a new inquiry so both arrangements keep their own history.'
              : 'Record each step when it actually happens: accept when you agree to supply, mark fulfilment arranged when pickup or delivery is settled, and completed only when the goods changed hands or the visit took place.'}
          </p>
          <p className="mt-2 text-xs text-ink-500">
            Marking a record completed is what lets the buyer review it, so an honest status matters more than a tidy one.
          </p>
        </CardBody>
      </Card>

      <p className="text-sm">
        <Link href="/dashboard/inquiries" className="underline font-semibold text-clay-700">
          Back to all inquiries
        </Link>
      </p>
    </Section>
  );
}
