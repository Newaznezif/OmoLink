import Link from 'next/link';
import { Badge, Card, CardBody, SampleTag } from './ui';
import { BuyerArrangementActions } from './buyer-arrangement-actions';
import { InquiryStatusPicker } from './inquiry-status-picker';
import { formatMoney } from '@/lib/money';
import type { Inquiry, Listing } from '@/lib/types';

export function arrangementTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'completed') return 'success';
  if (status === 'cancelled') return 'danger';
  if (status === 'new' || status === 'awaiting_confirmation') return 'warning';
  return 'neutral';
}

export function arrangementLabel(status: string): string {
  return status.replace(/_/g, ' ');
}

/**
 * One inquiry, rendered for whichever party owns the record. Amounts are the
 * estimate the server computed from the listing price at the time — never a
 * claim of payment. The seller's copy shows the reply contact the buyer
 * submitted for exactly that purpose.
 */
export function ArrangementCard({
  inquiry,
  listing,
  canAct = false,
  showHistory = false,
  side = 'buyer'
}: {
  inquiry: Inquiry;
  listing?: Listing;
  canAct?: boolean;
  showHistory?: boolean;
  side?: 'buyer' | 'seller';
}) {
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="text-sm text-ink-500">{inquiry.reference}</div>
            <h3 className="font-semibold text-ink-900">
              {listing ? (
                <Link href={`/listings/${listing.id}`} className="underline">
                  {listing.title}
                </Link>
              ) : (
                'This listing is no longer published'
              )}
            </h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone={arrangementTone(inquiry.status)}>{arrangementLabel(inquiry.status)}</Badge>
            {listing?.kind === 'service' ? <Badge tone="info">booking</Badge> : null}
            {inquiry.isDemo && <SampleTag />}
          </div>
        </div>

        <dl className="mt-3 grid sm:grid-cols-4 gap-3 text-sm">
          <div>
            <dt className="text-ink-500">Quantity</dt>
            <dd className="text-ink-900 font-medium">
              {inquiry.quantity} {inquiry.unitOfSale}
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Estimated subtotal</dt>
            <dd className="text-ink-900 font-medium">
              {formatMoney({ cents: inquiry.estimatedSubtotalCents, currency: inquiry.currency })}
            </dd>
          </div>
          <div>
            <dt className="text-ink-500">Arrange</dt>
            <dd className="text-ink-900">{inquiry.preference}</dd>
          </div>
          <div>
            <dt className="text-ink-500">Preferred date</dt>
            <dd className="text-ink-900">{inquiry.preferredDate || '—'}</dd>
          </div>
        </dl>

        {side === 'seller' && (
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">From</dt>
              <dd className="text-ink-900 font-medium">{inquiry.buyerName}</dd>
            </div>
            <div>
              <dt className="text-ink-500">Reply to</dt>
              <dd className="text-ink-900">{inquiry.buyerContact}</dd>
            </div>
          </dl>
        )}

        {inquiry.message && !showHistory && (
          <p className="mt-3 text-sm text-ink-700 line-clamp-2 whitespace-pre-line">{inquiry.message}</p>
        )}
        {showHistory && inquiry.message && (
          <p className="mt-3 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{inquiry.message}</p>
        )}

        <p className="mt-3 text-sm text-ink-500">
          Sent {new Date(inquiry.createdAt).toLocaleString()} · last change {new Date(inquiry.updatedAt).toLocaleString()}
        </p>

        {showHistory && inquiry.events.length > 0 && (
          <ul className="mt-2 space-y-1 text-xs text-ink-500">
            {inquiry.events.map((e) => (
              <li key={e.id}>
                <span className="font-mono">{new Date(e.at).toLocaleString()}</span> · {e.actor} · {e.detail}
              </li>
            ))}
          </ul>
        )}

        {canAct && side === 'buyer' && (
          <div className="mt-3">
            <BuyerArrangementActions inquiryId={inquiry.id} current={inquiry.status} />
          </div>
        )}
        {canAct && side === 'seller' && (
          <div className="mt-3">
            <InquiryStatusPicker inquiryId={inquiry.id} current={inquiry.status} />
          </div>
        )}

        <p className="mt-3 text-xs text-ink-500">
          {side === 'seller'
            ? 'No money has changed hands through OmoNETAB: the estimate is the listing price at the time of the request times the quantity asked for. Agree payment terms yourself, then record what actually happened.'
            : 'No money has changed hands through OmoNETAB: the estimate is what the listing price times your quantity came to when you sent the request.'}
        </p>
      </CardBody>
    </Card>
  );
}
