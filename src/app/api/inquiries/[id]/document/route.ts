import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { buildReceiptDocument, renderReceiptPdf } from '@/lib/receipts';
import { getLanguage, getT } from '@/lib/i18n/server';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Prints the document for an inquiry itself — the record a buyer holds before any
 * payment, and the only document a seller is given for an arrangement.
 *
 * Which document comes out depends on the stored records, not on the URL: an
 * inquiry with no payment attempt is printed as an inquiry record that says in
 * its own title that it is not a receipt, and an inquiry whose attempt a provider
 * has confirmed is printed as the payment document for that attempt. Nothing here
 * can be asked to call an unpaid inquiry a receipt.
 */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const t = getT();
  let actor: Actor;
  try {
    actor = await requireRole(['buyer', 'producer', 'coordinator', 'admin']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiDocument.signIn'));
    return NextResponse.json(body, { status });
  }

  const repo = getRepo();
  const inquiry = await repo.getInquiry(params.id);
  if (!inquiry) {
    return NextResponse.json({ error: t('apiDocument.notOnRecord') }, { status: 404 });
  }

  const listing = await repo.getListing(inquiry.listingId);
  const isBuyer = Boolean(inquiry.buyerProfileId) && inquiry.buyerProfileId === actor.profileId;
  const isSeller = Boolean(listing) && listing!.producerId === actor.profileId;
  if (!isBuyer && !isSeller && actor.role !== 'admin') {
    return NextResponse.json({ error: t('apiDocument.belongsToOther') }, { status: 403 });
  }

  // Newest first: the document describes the arrangement as it stands now, and a
  // failed attempt does not erase a confirmed one.
  const payments = await repo.listPaymentsForInquiry(inquiry.id);
  const newest = [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const [buyerProfile, sellerProfile] = await Promise.all([
    inquiry.buyerProfileId ? repo.getProfile(inquiry.buyerProfileId) : Promise.resolve(undefined),
    listing ? repo.getProfile(listing.producerId) : Promise.resolve(undefined)
  ]);

  const document = buildReceiptDocument({
    lang: getLanguage(),
    inquiry,
    payment: newest,
    listing,
    buyerProfile,
    sellerProfile
  });

  const pdf = await renderReceiptPdf(document);
  return new NextResponse(pdf as unknown as BodyInit, {
    status: 200,
    headers: {
      'content-type': 'application/pdf',
      'content-disposition': `attachment; filename="${document.fileName}"`,
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff'
    }
  });
}
