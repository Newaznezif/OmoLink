import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { buildReceiptDocument, renderReceiptPdf } from '@/lib/receipts';
import { getLanguage } from '@/lib/i18n/server';
import { authErrorResponse, requireRole, type Actor } from '@/lib/session';

export const dynamic = 'force-dynamic';

/**
 * Prints the document for one payment attempt.
 *
 * Authorisation is decided here rather than by hiding a link: the reference in
 * the URL names a record, and the record's own buyer field decides who may read
 * it. Nothing the browser sends besides that reference is trusted, and the
 * document's figures are copied from the stored payment, so editing the URL
 * changes which record is looked up, never what is written on it.
 *
 * A payment receipt is the payer's document. The seller of the arrangement can
 * read the same status on their inquiry page and can print the inquiry record,
 * which is the document about the arrangement rather than about someone else's
 * money.
 */
export async function GET(_req: Request, { params }: { params: { reference: string } }) {
  let actor: Actor;
  try {
    actor = await requireRole(['buyer', 'producer', 'coordinator', 'admin']);
  } catch (err) {
    const { body, status } = authErrorResponse(err, 'Sign in to open this document.');
    return NextResponse.json(body, { status });
  }

  const repo = getRepo();
  const payment = await repo.getPayment(params.reference);
  if (!payment) {
    return NextResponse.json({ error: 'No payment with that reference is on the record.' }, { status: 404 });
  }
  const isOwner = payment.buyerProfileId === actor.profileId;
  if (!isOwner && actor.role !== 'admin') {
    return NextResponse.json(
      {
        error:
          'A payment receipt is the payer’s own document. As the seller you can print the inquiry record instead, which shows the same payment status.'
      },
      { status: 403 }
    );
  }

  const inquiry = await repo.getInquiry(payment.inquiryId);
  if (!inquiry) {
    // A payment whose inquiry has gone cannot be printed: the document would
    // have to invent the part it is a receipt for.
    return NextResponse.json({ error: 'The inquiry this payment belongs to is not on the record.' }, { status: 404 });
  }

  const [listing, buyerProfile, sellerProfile] = await Promise.all([
    repo.getListing(inquiry.listingId),
    repo.getProfile(payment.buyerProfileId),
    repo.getProfile(payment.sellerProfileId)
  ]);

  const document = buildReceiptDocument({
    lang: getLanguage(),
    inquiry,
    payment,
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
      // A document about someone's money must not sit in a shared cache.
      'cache-control': 'private, no-store, max-age=0',
      'x-content-type-options': 'nosniff'
    }
  });
}
