import Link from 'next/link';
import type { Listing, Profile } from '@/lib/types';
import { formatMoney } from '@/lib/money';
import { getLanguage, getT } from '@/lib/i18n/server';
import { listingTexts } from '@/lib/i18n/catalog';
import { Badge } from './ui';
import { SampleTag, VerificationLabel } from './status-labels';

export function ListingCard({ listing, producer }: { listing: Listing; producer?: Profile }) {
  const t = getT();
  // The producer's own wording stays in place when there is no translation.
  const copy = listingTexts(getLanguage(), listing);

  return (
    <article className="bg-white border border-ink-100 rounded-2xl card-shadow overflow-hidden flex flex-col">
      <Link href={`/listings/${listing.id}`} className="block focus-visible:outline-3">
        <div className="aspect-[4/3] bg-clay-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={listing.images[0]?.src}
            alt={listing.images[0]?.alt ?? copy.title.text}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      </Link>
      <div className="p-4 flex-1 flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <Link href={`/listings/${listing.id}`} className="font-semibold text-ink-900 hover:underline">
            {copy.title.text}
          </Link>
        </div>
        <div className="text-sm text-ink-700">
          {producer ? (
            <Link href={`/producers/${producer.id}`} className="hover:underline">
              {producer.displayName}
            </Link>
          ) : (
            <span>{listing.community}</span>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-bold text-clay-800">{formatMoney(listing.unitPrice)}</span>
          <span className="text-ink-500">{t('listing.unitSuffix', { unit: listing.unitOfSale })}</span>
          {listing.minOrderQuantity > 1 && (
            <Badge tone="neutral">
              {t('listing.minOrder', { count: listing.minOrderQuantity, unit: listing.unitOfSale })}
            </Badge>
          )}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          <VerificationLabel status={listing.verification} isDemo={listing.isDemo} />
          <AvailabilityBadge availability={listing.availability} quantity={listing.availableQuantity} />
          {listing.isDemo && <SampleTag />}
        </div>
      </div>
    </article>
  );
}

function AvailabilityBadge({ availability, quantity }: { availability: Listing['availability']; quantity: number }) {
  const t = getT();
  if (availability === 'unavailable') return <Badge tone="danger">{t('status.unavailable')}</Badge>;
  if (availability === 'made_to_order') return <Badge tone="info">{t('status.madeToOrder')}</Badge>;
  if (availability === 'seasonal') return <Badge tone="warning">{t('status.seasonal')}</Badge>;
  if (availability === 'limited' || quantity <= 5) {
    return <Badge tone="warning">{t('status.limited', { count: quantity })}</Badge>;
  }
  return <Badge tone="success">{t('status.availableCount', { count: quantity })}</Badge>;
}
