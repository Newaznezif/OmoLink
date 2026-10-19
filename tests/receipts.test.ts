import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import {
  buildReceiptDocument,
  receiptDocumentId,
  receiptFileName,
  renderReceiptPdf,
  type ReceiptDocument
} from '../src/lib/receipts';
import { toWinAnsi } from '../src/lib/pdf-kit';
import type { Inquiry, LanguageCode, Listing, Payment, Profile } from '../src/lib/types';

/**
 * The receipt rules, tested on the data builder rather than on a browser: what a
 * document is allowed to title itself, which figures it may print, and what it
 * must say when the record is incomplete, simulated, or in a script the PDF font
 * cannot draw.
 */

const ISO = '2026-10-15T09:00:00.000Z';

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inq_test_1',
    reference: 'Q-2026-10-15-ABCD',
    listingId: 'lst_test_1',
    buyerName: 'Almaz Tesfaye',
    buyerContact: '+251 900 000 000',
    buyerProfileId: 'demo_user_buyer',
    quantity: 3,
    unitOfSale: 'kg',
    estimatedSubtotalCents: 45_000,
    currency: 'ETB',
    preference: 'pickup',
    message: '',
    status: 'accepted',
    createdAt: ISO,
    updatedAt: ISO,
    events: [],
    isDemo: false,
    ...overrides
  };
}

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'pay_test_1',
    reference: 'OMN-PAY-TEST-1',
    inquiryId: 'inq_test_1',
    listingId: 'lst_test_1',
    buyerProfileId: 'demo_user_buyer',
    sellerProfileId: 'pilot_user_seller',
    provider: 'demo_simulated',
    amountCents: 45_000,
    currency: 'ETB',
    status: 'confirmed',
    createdAt: ISO,
    updatedAt: ISO,
    confirmedAt: '2026-10-15T09:12:00.000Z',
    isDemo: true,
    events: [],
    ...overrides
  };
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'lst_test_1',
    slug: 'honey',
    kind: 'product',
    title: 'Forest honey',
    description: '',
    categoryId: 'cat_1',
    producerId: 'pilot_user_seller',
    community: 'Hamer',
    unitPrice: { cents: 15_000, currency: 'ETB' },
    unitOfSale: 'kg',
    availableQuantity: 100,
    minOrderQuantity: 1,
    availability: 'available',
    pickupOptions: [],
    deliveryAvailable: false,
    lastUpdated: ISO,
    createdAt: ISO,
    verification: 'unverified',
    published: true,
    images: [],
    isDemo: false,
    ...overrides
  };
}

function makeProfile(overrides: Partial<Profile> = {}): Profile {
  return {
    id: 'pilot_user_seller',
    userId: 'u_seller',
    displayName: 'Jinka Honey Collective',
    producerType: 'artisan',
    role: 'producer',
    accountKind: 'producer',
    status: 'active',
    community: 'Hamer',
    operatingArea: 'Jinka',
    preferredLanguage: 'en',
    contactMethod: { kind: 'phone', value: '+251 911 000 000', consent: true },
    shortBio: '',
    categories: [],
    consentToPublish: true,
    verification: 'unverified',
    groupIds: [],
    createdAt: ISO,
    updatedAt: ISO,
    isDemo: false,
    ...overrides
  };
}

function document(overrides: {
  lang?: LanguageCode;
  inquiry?: Partial<Inquiry>;
  payment?: Partial<Payment> | null;
  listing?: Partial<Listing> | null;
} = {}): ReceiptDocument {
  const payment = overrides.payment === null ? undefined : makePayment(overrides.payment ?? {});
  const listing = overrides.listing === null ? undefined : makeListing(overrides.listing ?? {});
  return buildReceiptDocument({
    lang: overrides.lang ?? 'en',
    inquiry: makeInquiry(overrides.inquiry ?? {}),
    payment,
    listing,
    buyerProfile: makeProfile({ id: 'demo_user_buyer', displayName: 'Almaz Tesfaye', role: 'buyer' }),
    sellerProfile: makeProfile(),
    nowIso: '2026-10-15T10:00:00.000Z'
  });
}

function allText(doc: ReceiptDocument): string {
  return [
    doc.title,
    doc.claim,
    ...doc.parties.flatMap((p) => [p.heading, p.name, ...p.detail]),
    ...doc.facts.flatMap((f) => [f.label, f.value]),
    doc.itemHeading,
    ...doc.itemColumns,
    ...doc.items.flatMap((i) => [i.description, i.quantity, i.unitPrice, i.amount]),
    ...doc.totals.flatMap((l) => [l.label, l.value]),
    ...doc.notices
  ].join('\n');
}

test('a confirmed payment is titled a receipt and prints the confirmed figure', () => {
  const doc = document();
  assert.equal(doc.kind, 'payment_receipt');
  assert.equal(doc.paid, true);
  assert.equal(doc.title, 'Payment receipt');
  assert.ok(doc.totals.some((line) => line.label === 'Confirmed as received' && line.value === '450.00 ETB'));
  assert.ok(doc.notices.some((notice) => notice.includes('server-side')));
});

test('a refunded payment stays a receipt but says the money went back', () => {
  const doc = document({ payment: { status: 'refunded', closedAt: '2026-10-16T08:00:00.000Z' } });
  assert.equal(doc.kind, 'payment_receipt');
  assert.equal(doc.refunded, true);
  assert.ok(doc.notices.some((notice) => notice.toLowerCase().includes('refunded')));
  assert.ok(doc.totals.some((line) => line.label === 'Returned to the buyer'));
  assert.ok(doc.facts.some((fact) => fact.label === 'Payment status on the record' && fact.value === 'Refunded'));
});

test('an unpaid inquiry produces a record that calls itself not a receipt', () => {
  const doc = document({ payment: null });
  assert.equal(doc.kind, 'inquiry_acknowledgement');
  assert.equal(doc.paid, false);
  assert.equal(doc.title, 'Inquiry record — not a receipt');
  assert.ok(!doc.totals.some((line) => line.label.includes('received')));
  assert.ok(doc.notices.some((notice) => notice.includes('not a receipt')));
  assert.ok(doc.notices.some((notice) => notice.includes('sample data') === false));
});

test('a pending payment is a summary, never a receipt', () => {
  const doc = document({ payment: { status: 'pending', confirmedAt: undefined, checkoutUrl: 'https://provider.example/pay', checkoutExpiresAt: '2026-10-15T10:30:00.000Z' } });
  assert.equal(doc.kind, 'payment_pending');
  assert.equal(doc.paid, false);
  assert.equal(doc.title, 'Payment summary — not a receipt');
  assert.ok(doc.facts.some((fact) => fact.label === 'Checkout window closes'));
  assert.ok(!doc.totals.some((line) => line.label === 'Confirmed as received'));
});

test('the document number comes from the stored reference and never changes', () => {
  const paid = document();
  assert.equal(paid.documentId, 'OMN-R-OMN-PAY-TEST-1');
  assert.equal(receiptDocumentId('payment_receipt', makePayment(), makeInquiry()), paid.documentId);
  assert.equal(receiptDocumentId('payment_pending', makePayment({ status: 'pending' }), makeInquiry()), 'OMN-P-OMN-PAY-TEST-1');
  assert.equal(receiptDocumentId('inquiry_acknowledgement', undefined, makeInquiry()), 'OMN-Q-Q-2026-10-15-ABCD');
  // Same records twice: the number is derived, not stored, so it is stable.
  assert.equal(document().documentId, paid.documentId);
  assert.equal(receiptFileName(paid.documentId), 'omonettab-OMN-R-OMN-PAY-TEST-1.pdf');
});

test('a payment that belongs to another inquiry is refused', () => {
  assert.throws(
    () => document({ payment: { inquiryId: 'inq_someone_else' } }),
    /same record/
  );
});

test('a confirmed amount that differs from the estimate is printed and flagged', () => {
  const doc = document({ payment: { amountCents: 44_000 } });
  assert.ok(doc.totals.some((line) => line.value === '440.00 ETB'));
  assert.ok(doc.totals.some((line) => line.value === '450.00 ETB'));
  assert.ok(doc.notices.some((notice) => notice.includes('differs from the estimate')));
});

test('a simulated payment is stamped and explained on the document', () => {
  const doc = document({ payment: { isDemo: true } });
  assert.equal(doc.isDemo, true);
  assert.ok(doc.notices.some((notice) => notice.includes('demo simulator')));
  const notDemo = document({ payment: { isDemo: false, provider: 'chapa' } });
  assert.equal(notDemo.isDemo, false);
  assert.ok(!notDemo.notices.some((notice) => notice.includes('demo simulator')));
});

test('a demo inquiry without a payment is labelled as sample data', () => {
  const doc = document({ payment: null, inquiry: { isDemo: true } });
  assert.equal(doc.isDemo, true);
  assert.ok(doc.notices.some((notice) => notice.includes('sample data')));
});

test('the PDF is printed in English for scripts the embedded font cannot draw', () => {
  assert.equal(document({ lang: 'zh-Hans' }).printedLanguage, 'en');
  assert.ok(document({ lang: 'zh-Hans' }).notices.some((notice) => notice.includes('printed in English')));
  assert.equal(document({ lang: 'am' }).printedLanguage, 'en');
  assert.equal(document({ lang: 'hamer' }).printedLanguage, 'en');
  // Italian uses the same Latin encoding, so its document is translated.
  const italian = document({ lang: 'it' });
  assert.equal(italian.printedLanguage, 'it');
  assert.equal(italian.title, 'Ricevuta di pagamento');
  assert.ok(!italian.notices.some((notice) => notice.includes('printed in English')));
});

test('characters outside the embedded font are replaced and reported', () => {
  assert.deepEqual(toWinAnsi('Honey — 150 ETB'), { text: 'Honey — 150 ETB', replaced: 0 });
  assert.deepEqual(toWinAnsi('Caffè “pul”'), { text: 'Caffè “pul”', replaced: 0 });
  const amharic = toWinAnsi('ሠላም');
  assert.equal(amharic.text, '???');
  assert.equal(amharic.replaced, 3);
  const doc = document({ listing: { title: 'ሠላም Honey' } });
  assert.ok(allText(doc).includes('ሠላም'), 'the stored text is kept for the screen');
  const bytes = renderReceiptPdf(doc);
  return bytes.then(async (pdf) => {
    const copy = await PDFDocument.load(pdf);
    assert.ok(copy.getPageCount() >= 1);
  });
});

test('a long name and many line items survive the layout instead of being cut off', async () => {
  const longName =
    'A very long producer name that will not fit on one line of a printed document at all, no matter how wide the column is, because it keeps going';
  const doc = document({ listing: { title: longName }, payment: {} });
  assert.equal(doc.items[0].description, longName);
  const short = await renderReceiptPdf(doc);
  const shortCopy = await PDFDocument.load(short);
  assert.equal(shortCopy.getPageCount(), 1);

  // The renderer takes any number of rows; a receipt with many of them must
  // paginate rather than run off the bottom of the page.
  const wide: ReceiptDocument = { ...doc, items: Array.from({ length: 60 }, () => ({
    description: longName,
    quantity: '3 kg',
    unitPrice: '150.00 ETB',
    amount: '450.00 ETB'
  })) };
  const wideBytes = await renderReceiptPdf(wide);
  const wideCopy = await PDFDocument.load(wideBytes);
  assert.ok(wideCopy.getPageCount() >= 2, `expected pagination, got ${wideCopy.getPageCount()} page(s)`);
});

test('every rendered document string is real wording, never a dictionary key', () => {
  for (const lang of ['en', 'it', 'zh-Hans', 'am', 'hamer', 'dag', 'tsamai'] as LanguageCode[]) {
    for (const variant of [document({ lang }), document({ lang, payment: null }), document({ lang, payment: { status: 'pending' } })]) {
      const text = allText(variant);
      assert.ok(!/(^|\n)(receipt|payment|inquiry|demoCheckout)\.[a-zA-Z]/.test(text), `${lang}: raw key leaked in ${text.slice(0, 120)}`);
      assert.ok(!text.includes('{'), `${lang}: an unfilled placeholder survived`);
    }
  }
});

test('the document copies figures from the records, not from anything a browser could send', () => {
  const doc = document({ payment: { amountCents: 45_000, feeCents: 500, currency: 'ETB' } });
  assert.equal(doc.totals.find((line) => line.label === 'Amount on the payment record')?.value, '450.00 ETB');
  assert.equal(doc.totals.find((line) => line.label === 'Fee the provider reported')?.value, '5.00 ETB');
  assert.ok(doc.facts.every((fact) => !/browser|request/i.test(fact.value) || fact.label === 'Billed to'));
});

test('timestamps on the document are fixed to UTC so two servers print the same receipt', () => {
  const doc = document();
  const issued = doc.facts.find((fact) => fact.label === 'Generated')?.value;
  assert.equal(issued, '2026-10-15 10:00 UTC');
});

test('the rendered PDF is a real file and names itself after the document number', async () => {
  const doc = document();
  const bytes = await renderReceiptPdf(doc);
  assert.equal(bytes.byteLength > 1_000, true, 'a one-line document should still carry font data');
  assert.deepEqual(Array.from(bytes.subarray(0, 5)), Array.from(new TextEncoder().encode('%PDF-')));
  assert.equal(doc.fileName, `omonettab-${doc.documentId}.pdf`);
});
