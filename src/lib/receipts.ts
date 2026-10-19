import { t, type TranslationKey } from './i18n';
import { formatMoney } from './money';
import { isPaid, receiptDocumentKind, PROVIDER_LABELS } from './payments';
import { CLAY, CONTENT_WIDTH, MOSS, MUTED, OCHRE, Writer, printableLanguage, toWinAnsi, type PdfColor } from './pdf-kit';
import type { Inquiry, LanguageCode, Listing, Payment, Profile } from './types';

/**
 * Turns stored records into a printable document, and that document into PDF
 * bytes. Nothing here reads a repository or a request: the caller passes the
 * records it already authorised, so the rules below can be tested without a
 * server and a route cannot forget a check.
 *
 * Two rules run through the whole file:
 *   1. Every figure and name is copied from a persisted record. A browser can
 *      choose which document to ask for, never what it says.
 *   2. The document says what it is. Only a payment a provider confirmed is
 *      titled a receipt; an unpaid inquiry produces an inquiry record that says
 *      in its own title that it is not one.
 */

export type ReceiptDocumentKind = ReturnType<typeof receiptDocumentKind>;

export type ReceiptLine = { label: string; value: string };

export type ReceiptItem = {
  description: string;
  quantity: string;
  unitPrice: string;
  amount: string;
};

export type ReceiptDocument = {
  kind: ReceiptDocumentKind;
  /**
   * Derived from the stored reference, so asking for the same record twice
   * produces the same number. It is not stored anywhere: the document is
   * regenerated on demand rather than kept as a second copy of the data.
   */
  documentId: string;
  /** Printed in the banner. */
  title: string;
  /** One line under the banner stating what the document can and cannot claim. */
  claim: string;
  issuedAt: string;
  paid: boolean;
  refunded: boolean;
  isDemo: boolean;
  /** The language the visitor asked the interface for. */
  requestedLanguage: LanguageCode;
  /** The language the PDF is actually printed in — see `printableLanguage()`. */
  printedLanguage: LanguageCode;
  parties: { heading: string; name: string; detail: string[] }[];
  facts: ReceiptLine[];
  itemHeading: string;
  itemColumns: string[];
  items: ReceiptItem[];
  totals: ReceiptLine[];
  notices: string[];
  fileName: string;
};

function money(cents: number, currency: 'ETB'): string {
  return formatMoney({ cents, currency });
}

function dateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  // Fixed UTC formatting: a receipt printed on a server must not depend on the
  // machine's locale or time zone.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

function contactLine(profile: Profile | undefined, fallback: string): string[] {
  const lines: string[] = [];
  if (profile?.organizationName) lines.push(profile.organizationName);
  // The display name is already the block's own line, so it is not repeated here.
  if (profile?.operatingArea) lines.push(profile.operatingArea);
  if (profile && profile.contactMethod.kind !== 'none' && 'value' in profile.contactMethod) {
    lines.push(`${profile.contactMethod.kind}: ${profile.contactMethod.value}`);
  }
  if (lines.length === 0 && fallback) lines.push(fallback);
  return lines;
}

/**
 * The stable document number. Derived only from stored references, so the same
 * inquiry or payment always carries the same number on every download.
 */
export function receiptDocumentId(kind: ReceiptDocumentKind, payment: Payment | undefined, inquiry: Inquiry): string {
  if (payment) {
    const prefix = kind === 'payment_receipt' ? 'R' : 'P';
    return `OMN-${prefix}-${payment.reference}`;
  }
  return `OMN-Q-${inquiry.reference}`;
}

export function receiptFileName(documentId: string): string {
  const safe = documentId.replace(/[^A-Za-z0-9._-]/g, '-').replace(/-+/g, '-').slice(0, 80);
  return `omonettab-${safe}.pdf`;
}

/**
 * Which words a download link may honestly use for the document that route would
 * print. The link is named after the document, so a buyer is never offered a
 * "receipt" for an inquiry nothing has been paid on.
 */
export function receiptLabelKey(payment: Payment | undefined): TranslationKey {
  if (!payment) return 'receipt.downloadInquiryRecord';
  return isPaid(payment) ? 'receipt.downloadReceipt' : 'receipt.downloadPaymentSummary';
}

/**
 * Builds the printable document. `payment` is the attempt this document describes;
 * omit it for an inquiry record. The route is responsible for having proved the
 * caller may see these records — this function refuses a payment that does not
 * belong to the inquiry it is printed against, because a mismatch would mean the
 * caller assembled a document out of two people's data.
 */
export function buildReceiptDocument(input: {
  lang: LanguageCode;
  inquiry: Inquiry;
  payment?: Payment;
  listing?: Listing;
  buyerProfile?: Profile;
  sellerProfile?: Profile;
  nowIso?: string;
}): ReceiptDocument {
  const { inquiry, payment, listing, buyerProfile, sellerProfile } = input;
  const nowIso = input.nowIso ?? new Date().toISOString();
  if (payment && payment.inquiryId !== inquiry.id) {
    throw new Error('The payment and the inquiry printed together must be the same record.');
  }

  const kind = receiptDocumentKind(payment);
  const paid = payment ? isPaid(payment) : false;
  const refunded = payment?.status === 'refunded';

  // English is the fallback whenever the requested language has no printable
  // coverage; the note below states which reason applies.
  const { printedLanguage, fallbackReason } = printableLanguage(input.lang);
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(printedLanguage, key, vars);

  const documentId = receiptDocumentId(kind, payment, inquiry);

  const title =
    kind === 'payment_receipt' ? tr('receipt.kind.receipt') : kind === 'payment_pending' ? tr('receipt.kind.pending') : tr('receipt.kind.acknowledgement');
  const claim =
    kind === 'payment_receipt' ? tr('receipt.rule.receipt') : kind === 'payment_pending' ? tr('receipt.rule.pending') : tr('receipt.rule.acknowledgement');

  const parties: ReceiptDocument['parties'] = [];
  parties.push({
    heading: tr('receipt.billedTo'),
    name: buyerProfile?.displayName || inquiry.buyerName,
    detail: contactLine(buyerProfile, inquiry.buyerContact)
  });
  parties.push({
    heading: tr('receipt.soldBy'),
    name: sellerProfile?.displayName || listing?.title || '',
    detail: contactLine(sellerProfile, listing ? `${tr('receipt.listing')}: ${listing.title}` : '')
  });

  const facts: ReceiptLine[] = [];
  facts.push({ label: tr('receipt.documentNumber'), value: documentId });
  if (payment) facts.push({ label: tr('receipt.paymentReference'), value: payment.reference });
  facts.push({ label: tr('receipt.inquiry'), value: inquiry.reference });
  facts.push({ label: tr('receipt.inquiryStatus'), value: tr(`inquiry.status.${inquiry.status}`) });
  if (payment) {
    facts.push({ label: tr('receipt.paymentStatus'), value: tr(`payment.status.${payment.status}`) });
    facts.push({ label: tr('receipt.provider'), value: PROVIDER_LABELS[payment.provider] });
    if (payment.paymentMethod) facts.push({ label: tr('receipt.method'), value: payment.paymentMethod });
    if (payment.providerReference) facts.push({ label: tr('receipt.providerReference'), value: payment.providerReference });
    facts.push({ label: tr('receipt.openedAt'), value: dateTime(payment.createdAt) });
    if (payment.confirmedAt) facts.push({ label: tr('receipt.confirmedAt'), value: dateTime(payment.confirmedAt) });
    if (payment.closedAt) facts.push({ label: tr('receipt.closedAt'), value: dateTime(payment.closedAt) });
    if (payment.checkoutExpiresAt) facts.push({ label: tr('receipt.checkoutCloses'), value: dateTime(payment.checkoutExpiresAt) });
  } else {
    facts.push({ label: tr('receipt.sentAt'), value: dateTime(inquiry.createdAt) });
  }
  facts.push({ label: tr('receipt.generatedAt'), value: dateTime(nowIso) });

  // The inquiry is the only item record the platform stores: one listing, one
  // quantity, one server-computed estimate. The table below still takes any
  // number of rows, because a wrapped description must survive more than one.
  const unitCents = listing
    ? listing.unitPrice.cents
    : inquiry.quantity > 0
      ? Math.round(inquiry.estimatedSubtotalCents / inquiry.quantity)
      : inquiry.estimatedSubtotalCents;
  const items: ReceiptItem[] = [
    {
      description: listing ? listing.title : `${tr('receipt.item')} ${inquiry.listingId}`,
      quantity: `${inquiry.quantity} ${inquiry.unitOfSale}`,
      unitPrice: money(unitCents, inquiry.currency),
      amount: money(inquiry.estimatedSubtotalCents, inquiry.currency)
    }
  ];

  const totals: ReceiptLine[] = [{ label: tr('receipt.subtotal'), value: money(inquiry.estimatedSubtotalCents, inquiry.currency) }];
  if (payment) {
    totals.push({ label: tr('receipt.amountOnRecord'), value: money(payment.amountCents, payment.currency) });
    if (paid) totals.push({ label: tr(refunded ? 'receipt.refundedAmount' : 'receipt.confirmedAmount'), value: money(payment.amountCents, payment.currency) });
    if (typeof payment.feeCents === 'number') totals.push({ label: tr('receipt.fee'), value: money(payment.feeCents, payment.currency) });
  }

  const notices: string[] = [];
  if (kind === 'payment_receipt') {
    notices.push(tr('receipt.verificationNote'));
    if (refunded) notices.push(tr('receipt.refundNote'));
  }
  if (kind === 'payment_pending') {
    notices.push(tr('receipt.pendingNotice'));
    if (payment?.checkoutUrl) notices.push(tr('receipt.checkoutNote'));
    if (payment?.failureReason) notices.push(tr('receipt.failureLine'));
  }
  if (kind === 'inquiry_acknowledgement') {
    notices.push(tr('receipt.acknowledgementNotice'));
  }
  if (payment && paid && payment.amountCents !== inquiry.estimatedSubtotalCents) {
    notices.push(tr('receipt.amountMismatch'));
  }
  if (payment?.isDemo) notices.push(tr('receipt.demoNotice'));
  if (!payment && inquiry.isDemo) notices.push(tr('receipt.demoInquiryNotice'));
  if (fallbackReason === 'script') notices.push(tr('receipt.languageNote.font'));
  if (fallbackReason === 'dictionary') notices.push(tr('receipt.languageNote.untranslated'));

  return {
    kind,
    documentId,
    title,
    claim,
    issuedAt: dateTime(nowIso),
    paid,
    refunded,
    isDemo: Boolean(payment?.isDemo) || (!payment && inquiry.isDemo),
    requestedLanguage: input.lang,
    printedLanguage,
    parties,
    facts,
    itemHeading: tr('receipt.itemHeading'),
    itemColumns: [tr('receipt.description'), tr('receipt.quantity'), tr('receipt.unitPrice'), tr('receipt.amount')],
    items,
    totals,
    notices,
    fileName: receiptFileName(documentId)
  };
}

const KIND_COLOR: Record<ReceiptDocumentKind, () => PdfColor> = {
  payment_receipt: () => MOSS,
  payment_pending: () => OCHRE,
  inquiry_acknowledgement: () => CLAY
};

/**
 * Renders a document to PDF bytes. Kept separate from the data builder so a test
 * can assert what a document says without parsing a file, and a route can render
 * the same object the page preview would show.
 */
export async function renderReceiptPdf(document: ReceiptDocument): Promise<Uint8Array> {
  const writer = await Writer.create();
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(document.printedLanguage, key, vars);
  const draw = (value: string) => toWinAnsi(value).text;

  writer.doc.setTitle(draw(`${document.title} — ${document.documentId}`));
  writer.doc.setAuthor('OmoNetTab');
  writer.doc.setSubject(draw(document.documentId));
  writer.doc.setCreator('OmoNetTab');
  writer.doc.setProducer('OmoNetTab');
  const createdAt = new Date(document.issuedAt);
  if (!Number.isNaN(createdAt.getTime())) writer.doc.setCreationDate(createdAt);

  writer.headerBand(
    draw('OmoNetTab'),
    draw(t(document.printedLanguage, 'brand.tagline')),
    [draw(`${tr('receipt.documentNumber')}: ${document.documentId}`), draw(`${tr('receipt.generatedAt')}: ${document.issuedAt}`)]
  );

  writer.banner(draw(document.title), draw(document.claim), KIND_COLOR[document.kind]());

  if (document.isDemo) writer.stamp(draw(tr('receipt.demoStamp')));

  writer.partyColumns(
    document.parties.map((party) => ({
      heading: draw(party.heading),
      name: draw(party.name),
      detail: party.detail.map(draw)
    }))
  );

  writer.rule();
  writer.sectionTitle(draw(tr('receipt.recordHeading')));
  for (const fact of document.facts) {
    writer.keyLine(draw(fact.label), draw(fact.value), { boldValue: false });
  }

  writer.space(6);
  writer.sectionTitle(draw(document.itemHeading));
  const widths = [CONTENT_WIDTH - 255, 90, 85, 80];
  writer.columns(
    document.itemColumns.map(draw),
    document.items.map((item) => [draw(item.description), draw(item.quantity), draw(item.unitPrice), draw(item.amount)]),
    widths
  );

  writer.space(4);
  writer.totals(document.totals.map((line) => ({ label: draw(line.label), value: draw(line.value) })));

  const notices = [...document.notices];
  if (countUnrepresentable(document) > 0) notices.push(tr('receipt.charsetNote'));

  if (notices.length > 0) {
    writer.space(6);
    writer.rule();
    writer.sectionTitle(draw(tr('receipt.notesHeading')));
    for (const notice of notices) {
      writer.paragraph(draw(notice), { size: 8.8, color: MUTED });
      writer.space(3);
    }
  }

  return writer.finish(
    [`OmoNetTab — ${tr('brand.tagline')}`, tr('receipt.footerRegenerate')],
    (page, pages) => draw(tr('receipt.pageOf', { page, pages }))
  );
}

/**
 * Counts characters the embedded font cannot draw, so the finished document can
 * admit the substitution rather than hide it.
 */
function countUnrepresentable(document: ReceiptDocument): number {
  const all = [
    document.title,
    document.claim,
    ...document.parties.flatMap((p) => [p.heading, p.name, ...p.detail]),
    ...document.facts.flatMap((f) => [f.label, f.value]),
    document.itemHeading,
    ...document.itemColumns,
    ...document.items.flatMap((i) => [i.description, i.quantity, i.unitPrice, i.amount]),
    ...document.totals.flatMap((tl) => [tl.label, tl.value]),
    ...document.notices
  ];
  return all.reduce((total, value) => total + toWinAnsi(value).replaced, 0);
}
