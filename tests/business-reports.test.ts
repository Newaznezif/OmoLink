import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import {
  REPORT_TIMEZONE,
  buildBusinessReport,
  buildReportDocument,
  dayKeyInZone,
  parseReportFilters,
  paymentWindowInstant,
  renderReportPdf,
  reportCsv,
  reportFileName,
  resolveRange,
  uniqueByReference,
  type ReportSource
} from '../src/lib/business-reports';
import type { Category, Inquiry, Listing, Payment, Profile } from '../src/lib/types';

/**
 * The reporting rules, tested on the numbers themselves rather than on a browser:
 * where a record falls in the day calendar, what may be called revenue, what
 * happens when the same payment arrives twice, and what the exported CSV and PDF
 * are allowed to claim.
 */

const DAY = '2026-10-15T12:00:00.000Z';

function makePayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: `pay_${Math.random().toString(36).slice(2, 8)}`,
    reference: 'OMN-PAY-1',
    inquiryId: 'inq_1',
    listingId: 'lst_1',
    buyerProfileId: 'prof_buyer',
    sellerProfileId: 'prof_seller',
    provider: 'demo_simulated',
    amountCents: 45_000,
    currency: 'ETB',
    status: 'confirmed',
    createdAt: '2026-10-15T08:00:00.000Z',
    updatedAt: '2026-10-15T09:00:00.000Z',
    confirmedAt: '2026-10-15T09:00:00.000Z',
    isDemo: true,
    events: [],
    ...overrides
  };
}

function makeInquiry(overrides: Partial<Inquiry> = {}): Inquiry {
  return {
    id: 'inq_1',
    reference: 'OL-2026-AAAA',
    listingId: 'lst_1',
    buyerName: 'Almaz Tesfaye',
    buyerContact: '+251 900 000 000',
    buyerProfileId: 'prof_buyer',
    quantity: 3,
    unitOfSale: 'kg',
    estimatedSubtotalCents: 45_000,
    currency: 'ETB',
    preference: 'pickup',
    message: '',
    status: 'accepted',
    createdAt: '2026-10-15T07:00:00.000Z',
    updatedAt: '2026-10-15T07:30:00.000Z',
    events: [],
    isDemo: false,
    ...overrides
  };
}

function makeListing(overrides: Partial<Listing> = {}): Listing {
  return {
    id: 'lst_1',
    slug: 'honey',
    kind: 'product',
    title: 'Forest honey',
    description: '',
    categoryId: 'cat_honey',
    producerId: 'prof_seller',
    community: 'Hamer',
    unitPrice: { cents: 15_000, currency: 'ETB' },
    unitOfSale: 'kg',
    availableQuantity: 100,
    minOrderQuantity: 1,
    availability: 'available',
    pickupOptions: [],
    deliveryAvailable: false,
    lastUpdated: DAY,
    createdAt: DAY,
    verification: 'unverified',
    published: true,
    images: [],
    isDemo: false,
    ...overrides
  };
}

function makeProfile(id: string, displayName: string, overrides: Partial<Profile> = {}): Profile {
  return {
    id,
    userId: `u_${id}`,
    displayName,
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
    createdAt: DAY,
    updatedAt: DAY,
    isDemo: false,
    ...overrides
  };
}

const CATEGORY_HONEY: Category = { id: 'cat_honey', name: 'Honey and local foods', slug: 'honey', kind: 'product', description: '' };
const CATEGORY_TEXTILE: Category = { id: 'cat_textile', name: 'Textiles', slug: 'textiles', kind: 'product', description: '' };

/** A source with two sellers, two categories and as many records as a test needs. */
function makeSource(input: {
  payments?: Payment[];
  inquiries?: Inquiry[];
  listings?: Listing[];
}): ReportSource {
  return {
    payments: input.payments ?? [],
    inquiries: input.inquiries ?? [makeInquiry()],
    listings:
      input.listings ?? [
        makeListing(),
        makeListing({ id: 'lst_2', slug: 'basket', title: 'Basket, large', producerId: 'prof_other', categoryId: 'cat_textile' })
      ],
    profiles: [makeProfile('prof_seller', 'Jinka Honey Collective'), makeProfile('prof_other', 'Debre Markos Weavers')],
    categories: [CATEGORY_HONEY, CATEGORY_TEXTILE]
  };
}

function report(input: { payments?: Payment[]; inquiries?: Inquiry[]; listings?: Listing[]; filters?: object; nowIso?: string }) {
  return buildBusinessReport({
    source: makeSource(input),
    range: resolveRange({ kind: 'day', nowIso: input.nowIso ?? DAY }),
    filters: input.filters as never,
    nowIso: input.nowIso ?? DAY
  });
}

/* ------------------------------------------------------------------ windows -- */

test('a day window runs from midnight to midnight in the reporting zone, not in UTC', () => {
  // 21:30 UTC is already the next calendar day in Africa/Addis_Ababa (UTC+3).
  const late = resolveRange({ kind: 'day', nowIso: '2026-10-15T21:30:00.000Z' });
  assert.equal(late.fromDay, '2026-10-16');
  assert.equal(late.toDay, '2026-10-16');
  assert.equal(late.fromIso, '2026-10-15T21:00:00.000Z');
  assert.equal(late.toIso, '2026-10-16T21:00:00.000Z');
  assert.equal(dayKeyInZone('2026-10-15T21:30:00.000Z'), '2026-10-16');
  assert.equal(dayKeyInZone('2026-10-15T20:59:00.000Z'), '2026-10-15');
});

test('the weekly window is seven reporting days ending today', () => {
  const week = resolveRange({ kind: 'week', nowIso: DAY });
  assert.equal(week.fromDay, '2026-10-09');
  assert.equal(week.toDay, '2026-10-15');
});

test('a custom range is kept, and a reversed one is read as the same window', () => {
  const forward = resolveRange({ kind: 'custom', from: '2026-10-01', to: '2026-10-05', nowIso: DAY });
  assert.equal(forward.fromDay, '2026-10-01');
  assert.equal(forward.invalidCustom, false);
  const reversed = resolveRange({ kind: 'custom', from: '2026-10-05', to: '2026-10-01', nowIso: DAY });
  assert.deepEqual([reversed.fromDay, reversed.toDay], ['2026-10-01', '2026-10-05']);
  assert.equal(reversed.invalidCustom, false);
});

test('an unreadable, empty or over-long custom range says so instead of inventing a window', () => {
  for (const bad of [
    { from: 'not-a-date', to: '2026-10-05' },
    { from: '', to: '' },
    { from: '2020-01-01', to: '2026-10-05' }
  ]) {
    const range = resolveRange({ kind: 'custom', ...bad, nowIso: DAY });
    assert.equal(range.kind, 'day', JSON.stringify(bad));
    assert.equal(range.invalidCustom, true, JSON.stringify(bad));
    assert.equal(range.fromDay, '2026-10-15');
  }
});

test('the file name carries the window so a download cannot be misdated', () => {
  assert.equal(reportFileName(resolveRange({ kind: 'week', nowIso: DAY })), 'omonettab-report-2026-10-09-to-2026-10-15.pdf');
});

/* ----------------------------------------------------------------- counting -- */

test('only a confirmed payment is revenue; every other status is counted apart', () => {
  const result = report({
    payments: [
      makePayment({ reference: 'R-CONF', status: 'confirmed' }),
      makePayment({ reference: 'R-PEND', status: 'pending', confirmedAt: undefined, updatedAt: '2026-10-15T08:05:00.000Z' }),
      makePayment({ reference: 'R-FAIL', status: 'failed', confirmedAt: undefined, closedAt: DAY, amountCents: 99_000 }),
      makePayment({ reference: 'R-CANC', status: 'cancelled', confirmedAt: undefined, closedAt: DAY }),
      makePayment({ reference: 'R-EXPIRED', status: 'expired', confirmedAt: undefined, closedAt: DAY })
    ]
  });
  assert.equal(result.totals.attempts, 5);
  assert.equal(result.totals.confirmed, 1);
  assert.equal(result.totals.revenueCents, 45_000);
  assert.equal(result.totals.awaiting, 1);
  assert.equal(result.totals.closed, 3);
  const pending = result.byStatus.find((entry) => entry.status === 'pending');
  assert.equal(pending?.countsAsRevenue, false);
  assert.equal(result.byStatus.find((entry) => entry.status === 'confirmed')?.countsAsRevenue, true);
});

test('a refund is reported apart from revenue rather than subtracted from it', () => {
  const result = report({
    payments: [
      makePayment({ reference: 'R-1', status: 'confirmed', amountCents: 45_000 }),
      makePayment({
        reference: 'R-2',
        status: 'refunded',
        amountCents: 20_000,
        confirmedAt: '2026-10-15T09:00:00.000Z',
        closedAt: '2026-10-15T10:00:00.000Z'
      })
    ]
  });
  assert.equal(result.totals.revenueCents, 45_000, 'a refunded payment must not sit in revenue');
  assert.equal(result.totals.refunded, 1);
  assert.equal(result.totals.refundedCents, 20_000);
  assert.equal(result.totals.confirmed, 1);
});

test('a repeated provider notification for one reference is counted once', () => {
  // The same attempt seen twice: the webhook retried and stored a second row.
  const result = report({
    payments: [
      makePayment({ id: 'pay_a', reference: 'R-DUP', status: 'pending', confirmedAt: undefined, updatedAt: '2026-10-15T08:10:00.000Z' }),
      makePayment({ id: 'pay_b', reference: 'R-DUP', status: 'confirmed', updatedAt: '2026-10-15T09:30:00.000Z', confirmedAt: '2026-10-15T09:30:00.000Z' })
    ]
  });
  assert.equal(result.totals.attempts, 1);
  assert.equal(result.totals.confirmed, 1);
  assert.equal(result.totals.revenueCents, 45_000);
  assert.equal(result.rows[0]?.status, 'confirmed', 'the row last touched wins');
});

test('uniqueByReference keeps one row per reference and prefers the newest', () => {
  const deduped = uniqueByReference([
    makePayment({ id: 'old', reference: 'R', updatedAt: '2026-10-15T08:00:00.000Z' }),
    makePayment({ id: 'new', reference: 'R', updatedAt: '2026-10-15T11:00:00.000Z' })
  ]);
  assert.deepEqual(deduped.map((payment) => payment.id), ['new']);
});

test('a buyer retrying the same checkout does not double the revenue either', () => {
  const result = report({
    payments: [
      makePayment({ reference: 'R-1', status: 'confirmed' }),
      makePayment({ reference: 'R-2', status: 'failed', confirmedAt: undefined, closedAt: DAY })
    ]
  });
  assert.equal(result.totals.revenueCents, 45_000);
  assert.equal(result.totals.attempts, 2);
});

test('an arrangement paid twice counts as one paid inquiry', () => {
  const result = report({
    payments: [
      makePayment({ reference: 'R-1', inquiryId: 'inq_1', status: 'confirmed' }),
      makePayment({ reference: 'R-2', inquiryId: 'inq_1', status: 'confirmed', amountCents: 45_000 })
    ]
  });
  assert.equal(result.totals.confirmed, 2);
  assert.equal(result.totals.paidInquiries, 1);
});

test('the day an attempt is counted in depends on whether it has an outcome yet', () => {
  const opened = '2026-10-14T22:00:00.000Z'; // 01:00 on the 15th in Addis
  assert.equal(paymentWindowInstant(makePayment({ status: 'pending', createdAt: opened, confirmedAt: undefined })), opened);
  assert.equal(
    paymentWindowInstant(makePayment({ status: 'confirmed', createdAt: opened, confirmedAt: '2026-10-15T12:00:00.000Z' })),
    '2026-10-15T12:00:00.000Z'
  );
  const result = report({
    payments: [makePayment({ reference: 'R-PEND', status: 'pending', createdAt: opened, confirmedAt: undefined, updatedAt: opened })]
  });
  assert.equal(result.byDay.length > 0, true);
  assert.equal(result.byDay.some((day) => day.day === '2026-10-15'), true, 'an awaiting attempt belongs to the day it was opened');
});

test('attempts outside the window are left out rather than shown as zero revenue', () => {
  const result = buildBusinessReport({
    source: makeSource({ payments: [makePayment({ reference: 'R-LAST-WEEK', createdAt: '2026-10-08T09:00:00.000Z', confirmedAt: '2026-10-08T09:00:00.000Z', updatedAt: '2026-10-08T09:00:00.000Z' })] }),
    range: resolveRange({ kind: 'day', nowIso: DAY }),
    nowIso: DAY
  });
  assert.equal(result.totals.attempts, 0);
  assert.equal(result.totals.revenueCents, 0);
});

/* ----------------------------------------------------------------- filters --- */

test('the filters read off a query string, ignoring values that are not single strings', () => {
  const filters = parseReportFilters({ status: 'confirmed', seller: ' prof_seller ', provider: ['a', 'b'], category: 'cat_honey' });
  assert.equal(filters.status, 'confirmed');
  assert.equal(filters.sellerId, 'prof_seller');
  assert.equal(filters.categoryId, 'cat_honey');
  assert.equal(filters.provider, '', 'a repeated parameter is not a filter');
});

test('a seller filter narrows both inquiries and payments to that seller', () => {
  const result = report({
    inquiries: [makeInquiry({ id: 'inq_1' }), makeInquiry({ id: 'inq_2', reference: 'OL-2026-BBBB', listingId: 'lst_2' })],
    payments: [
      makePayment({ reference: 'R-1', inquiryId: 'inq_1' }),
      makePayment({ reference: 'R-2', inquiryId: 'inq_2', listingId: 'lst_2', sellerProfileId: 'prof_other' })
    ],
    filters: { sellerId: 'prof_seller' }
  });
  assert.equal(result.totals.inquiries, 1);
  assert.equal(result.totals.attempts, 1);
  assert.equal(result.rows[0]?.paymentReference, 'R-1');
  assert.equal(result.bySeller.length, 1);
});

test('a category filter follows the listing, and the page has to say inquiries are counted that way too', () => {
  const result = report({
    inquiries: [makeInquiry({ id: 'inq_1' }), makeInquiry({ id: 'inq_2', reference: 'OL-2026-BBBB', listingId: 'lst_2' })],
    payments: [makePayment({ reference: 'R-1' }), makePayment({ reference: 'R-2', inquiryId: 'inq_2', listingId: 'lst_2', sellerProfileId: 'prof_other' })],
    filters: { categoryId: 'cat_textile' }
  });
  assert.equal(result.totals.inquiries, 1);
  assert.equal(result.rows[0]?.paymentReference, 'R-2');
  assert.deepEqual(result.byCategory.map((entry) => entry.label), ['Textiles']);
});

test('a status filter changes the payment figures but never hides the inquiries', () => {
  const result = report({
    inquiries: [makeInquiry({ id: 'inq_1' }), makeInquiry({ id: 'inq_2', reference: 'OL-2026-BBBB', listingId: 'lst_2' })],
    payments: [makePayment({ reference: 'R-1', status: 'confirmed' }), makePayment({ reference: 'R-2', inquiryId: 'inq_2', listingId: 'lst_2', status: 'pending', confirmedAt: undefined })],
    filters: { status: 'confirmed' }
  });
  assert.equal(result.totals.inquiries, 2, 'an unpaid inquiry is still an inquiry');
  assert.equal(result.totals.attempts, 1);
  assert.equal(result.totals.revenueCents, 45_000);
});

test('a provider filter only applies to payments', () => {
  const result = report({
    payments: [
      makePayment({ reference: 'R-1', provider: 'demo_simulated' }),
      makePayment({ reference: 'R-2', inquiryId: 'inq_1', provider: 'chapa' })
    ],
    filters: { provider: 'chapa' }
  });
  assert.equal(result.totals.attempts, 1);
  assert.equal(result.byProvider.length, 1);
  assert.equal(result.totals.inquiries, 1);
});

test('seller and category names come from the stored records', () => {
  const result = report({ payments: [makePayment({ reference: 'R-1' })] });
  assert.equal(result.rows[0]?.sellerName, 'Jinka Honey Collective');
  assert.equal(result.rows[0]?.categoryName, 'Honey and local foods');
});

/* -------------------------------------------------------------------- CSV ---- */

/** Splits a CSV line on commas that are not inside quotes. */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ',') {
      cells.push(cell);
      cell = '';
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

test('the CSV writes the window on every row and flags revenue per row', () => {
  const result = report({
    payments: [makePayment({ reference: 'R-1', status: 'confirmed' }), makePayment({ reference: 'R-2', status: 'pending', confirmedAt: undefined })]
  });
  const lines = reportCsv(result).trim().split('\n');
  const header = lines[0].split(',');
  assert.equal(header[0], 'payment_reference');
  assert.equal(header.includes('counts_as_revenue'), true);
  assert.equal(lines.length, 3);
  for (const line of lines.slice(1)) {
    assert.equal(line.includes('Africa/Addis_Ababa'), true);
    assert.equal(line.includes('2026-10-15T21:00:00.000Z'), true, 'the window start travels with the row');
  }
  assert.equal(lines[1].includes('R-2,true'), false);
});

test('a comma or a quote inside a stored name is quoted, not allowed to shift columns', () => {
  const result = buildBusinessReport({
    source: makeSource({
      listings: [makeListing({ title: 'Honey, raw "jars" only' })],
      payments: [makePayment({ reference: 'R-1' })],
      inquiries: [makeInquiry()]
    }),
    range: resolveRange({ kind: 'day', nowIso: DAY }),
    nowIso: DAY
  });
  const line = reportCsv(result).trim().split('\n')[1];
  assert.equal(line.includes('"Honey, raw ""jars"" only"'), true, line);
  assert.equal(parseCsvLine(line).length, reportCsv(result).trim().split('\n')[0].split(',').length, 'the quoted comma must not add a column');
});

test('a stored name that looks like a spreadsheet formula is neutralised before export', () => {
  const result = buildBusinessReport({
    source: makeSource({ listings: [makeListing({ title: '=HYPERLINK("http://evil")' })], payments: [makePayment({ reference: 'R-1' })] }),
    range: resolveRange({ kind: 'day', nowIso: DAY }),
    nowIso: DAY
  });
  const line = reportCsv(result).trim().split('\n')[1];
  assert.equal(line.includes("'="), true, line);
});

/* ------------------------------------------------------------- the document -- */

const textOf = (doc: ReturnType<typeof buildReportDocument>): string =>
  [
    doc.title,
    doc.claim,
    doc.windowLine,
    doc.generatedAt,
    ...doc.summary.flatMap((line) => [line.label, line.value]),
    ...doc.tables.flatMap((table) => [table.heading, ...table.columns, ...table.rows.flat()]),
    ...doc.notices
  ].join('\n');

test('the PDF claims only what the records support, and says how days are measured', () => {
  const doc = buildReportDocument({ report: report({ payments: [makePayment({ reference: 'R-1' })] }), lang: 'en' });
  assert.equal(doc.title, 'Daily report — Daily and weekly reports');
  assert.equal(/only payments whose own status is confirmed/i.test(doc.claim), true, doc.claim);
  assert.equal(doc.windowLine.includes(`${REPORT_TIMEZONE}`), true);
  // Every character the PDF font can draw: the arrow the page uses is not one of them.
  assert.equal(doc.windowLine.includes('→'), false);
  assert.equal(doc.notices.some((notice) => /never added to revenue/.test(notice)), true);
  assert.equal(doc.notices.some((notice) => /Africa\/Addis_Ababa/.test(notice)), true);
});

test('no raw dictionary key reaches a printed document', () => {
  const leaked = /\b(?:reports|receipt|payment|common|brand|admin|filter)\.[a-zA-Z][a-zA-Z0-9]*/;
  for (const lang of ['en', 'it', 'zh-Hans', 'am'] as const) {
    const doc = buildReportDocument({ report: report({ payments: [makePayment({ reference: 'R-1' })], filters: { status: 'confirmed' } }), lang });
    assert.equal(leaked.test(textOf(doc)), false, `${lang}: ${textOf(doc).match(leaked)?.[0]}`);
  }
});

test('a report with no rows still prints, with the window’s days shown as zero', async () => {
  const doc = buildReportDocument({ report: report({ payments: [], inquiries: [] }), lang: 'en' });
  assert.equal(doc.tables.length, 6);
  const byDay = doc.tables.find((table) => table.heading === 'Day by day');
  assert.deepEqual(byDay?.rows, [['2026-10-15', '0', '0', '0', '0.00 ETB']]);
  for (const table of doc.tables.filter((t) => t.heading !== 'Day by day')) assert.equal(table.rows.length, 0, table.heading);
  const drawn = pdfText(await renderReportPdf(doc));
  assert.equal(drawn.includes('Daily and weekly reports'), true);
  assert.equal(drawn.includes('0.00 ETB'), true, 'the empty day is printed as a zero, not as a blank');
  assert.equal(/never added to revenue/.test(drawn), true, 'the counting rules are printed even when there is nothing to count');
  assert.equal(/\?\?/.test(drawn), false, 'an empty report has nothing to substitute');
});

test('simulated rows are counted and labelled, not hidden', () => {
  const doc = buildReportDocument({ report: report({ payments: [makePayment({ reference: 'R-1', isDemo: true })] }), lang: 'en' });
  assert.equal(doc.isDemo, true);
  assert.equal(doc.notices.some((notice) => /Simulated demo data/.test(notice)), true, doc.notices.join(' | '));
});

test('a status or provider filter is stated on the document, since inquiries are not filtered by it', () => {
  const doc = buildReportDocument({ report: report({ payments: [makePayment({ reference: 'R-1' })], filters: { status: 'confirmed' } }), lang: 'en' });
  assert.equal(doc.notices.some((notice) => /apply to payment figures only/.test(notice)), true);
});

test('an unreadable custom range is admitted on the document', () => {
  const range = resolveRange({ kind: 'custom', from: 'yesterday', to: 'today', nowIso: DAY });
  const built = buildBusinessReport({ source: makeSource({ payments: [makePayment({ reference: 'R-1' })] }), range, nowIso: DAY });
  const doc = buildReportDocument({ report: built, lang: 'en' });
  assert.equal(doc.notices.some((notice) => /readable window/.test(notice)), true);
});

test('rows that do not fit the page are pointed at the CSV instead of silently dropped', () => {
  const many = Array.from({ length: 8 }, (_, i) => makePayment({ reference: `R-${i}`, inquiryId: 'inq_1' }));
  const built = buildBusinessReport({ source: makeSource({ payments: many }), range: resolveRange({ kind: 'day', nowIso: DAY }), nowIso: DAY });
  const doc = buildReportDocument({ report: built, lang: 'en', maxRowsPerTable: 5 });
  const ledger = doc.tables.find((table) => table.rows.length <= 5 && table.columns[0] === 'Payment reference');
  assert.ok(ledger, 'the ledger table printed');
  assert.equal(ledger?.rows.length, 5);
  assert.equal(doc.notices.some((notice) => /CSV/.test(notice) && /3 further rows/.test(notice)), true, doc.notices.join(' | '));
});

test('a visitor whose script the font cannot draw is printed in English and told why', () => {
  const built = report({ payments: [makePayment({ reference: 'R-1' })] });
  const chinese = buildReportDocument({ report: built, lang: 'zh-Hans' });
  assert.equal(chinese.requestedLanguage, 'zh-Hans');
  assert.equal(chinese.printedLanguage, 'en');
  assert.equal(chinese.notices.some((notice) => /font/.test(notice)), true);
  const italian = buildReportDocument({ report: built, lang: 'it' });
  assert.equal(italian.printedLanguage, 'it');
  assert.equal(italian.title.startsWith('Report giornaliero'), true, italian.title);
});

test('a stored name in a script the font cannot draw is admitted on the page', async () => {
  const source: ReportSource = {
    payments: [makePayment({ reference: 'R-1' })],
    inquiries: [makeInquiry()],
    listings: [makeListing()],
    profiles: [makeProfile('prof_seller', 'ጥብቅ ማር አካል ገበያ')],
    categories: [CATEGORY_HONEY, CATEGORY_TEXTILE]
  };
  const built = buildBusinessReport({
    source,
    range: resolveRange({ kind: 'day', nowIso: DAY }),
    nowIso: DAY
  });
  const drawn = pdfText(await renderReportPdf(buildReportDocument({ report: built, lang: 'en' })));
  assert.equal(/printed as \?/.test(drawn), true, 'the document must say the substitution happened');
  assert.equal(/\?\?\?/.test(drawn), true, 'the Amharic seller name is drawn as question marks');
});

/**
 * Reads the printed strings back out of a rendered PDF. The content streams are
 * Flate-compressed and the text is written as hex, so this is the only way to ask
 * what a reader would actually see rather than what the builder intended.
 */
function pdfText(bytes: Uint8Array): string {
  const pdf = Buffer.from(bytes);
  const start = Buffer.from('stream', 'latin1');
  const end = Buffer.from('endstream', 'latin1');
  const streams: string[] = [];
  let cursor = pdf.indexOf(start);
  while (cursor !== -1) {
    const bodyStart = cursor + start.length + (pdf[cursor + start.length] === 13 ? 2 : 1);
    const bodyEnd = pdf.indexOf(end, bodyStart);
    if (bodyEnd === -1) break;
    try {
      const inflated = inflateSync(pdf.subarray(bodyStart, bodyEnd)).toString('latin1');
      if (inflated.includes('Tj') || inflated.includes('TJ')) streams.push(inflated);
    } catch {
      // Not a Flate stream (a font, most likely); nothing to read.
    }
    // Step past `endstream` itself, whose last six bytes are also `stream`.
    cursor = pdf.indexOf(start, bodyEnd + end.length);
  }
  const out: string[] = [];
  for (const stream of streams) {
    for (const line of stream.split('\n')) {
      const hex = /^<([0-9A-Fa-f]+)> Tj$/.exec(line.trim());
      if (hex) out.push(Buffer.from(hex[1], 'hex').toString('latin1'));
      const literal = /^\(((?:[^()\\]|\\.)*)\) Tj$/.exec(line.trim());
      if (literal) out.push(literal[1]);
    }
  }
  return out.join('\n');
}

test('the rendered PDF is a real document that names its own window', async () => {
  const doc = buildReportDocument({ report: report({ payments: [makePayment({ reference: 'R-1' })] }), lang: 'en' });
  const bytes = await renderReportPdf(doc);
  const loaded = await PDFDocument.load(bytes);
  assert.equal(loaded.getTitle(), 'Daily report — Daily and weekly reports');
  assert.equal(loaded.getSubject(), '2026-10-15 to 2026-10-15 (Africa/Addis_Ababa)');
  assert.equal(loaded.getPageCount() >= 1, true);
});

test('the report module holds no numbers a browser could have supplied', () => {
  const built = report({ payments: [makePayment({ reference: 'R-1', amountCents: 12_345 })] });
  assert.equal(built.totals.revenueCents, 12_345);
  const doc = buildReportDocument({ report: built, lang: 'en' });
  assert.equal(doc.summary.some((line) => line.value === '123.45 ETB'), true, JSON.stringify(doc.summary));
});
