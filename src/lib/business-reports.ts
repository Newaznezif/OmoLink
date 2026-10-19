import { t, type TranslationKey } from './i18n';
import { formatMoney } from './money';
import { PROVIDER_LABELS } from './payments';
import { CLAY, CONTENT_WIDTH, MUTED, Writer, printableLanguage, toWinAnsi } from './pdf-kit';
import type { Category, Inquiry, LanguageCode, Listing, Payment, PaymentProviderId, PaymentStatus, Profile } from './types';

/**
 * The administrator's business report: what was asked for, what was attempted,
 * and what a provider actually confirmed, inside one window of time.
 *
 * Like the receipt builder, this file reads nothing. The caller passes records it
 * has already authorised the administrator to see, so the counting rules below
 * hold in the page, in the CSV export and in the PDF export alike — there is no
 * second implementation to drift.
 *
 * The counting rules the spec demands:
 *   1. Revenue is the sum of payments whose own status is `confirmed`. Pending,
 *      failed, cancelled and expired attempts are counted as attempts and never
 *      as money.
 *   2. A refund is not revenue either, but it is not deleted from history: refunded
 *      rows are reported in their own column so a reader can see money that was
 *      confirmed and then returned.
 *   3. Repeated provider notifications for one reference update a single payment
 *      record, so a webhook retry contributes one row. `uniqueByReference` is the
 *      same rule applied defensively at read time: two stored rows carrying one
 *      reference are counted once.
 *   4. Several attempts against one arrangement cannot make it "paid" twice —
 *      `paidInquiries` counts distinct inquiries with a confirmed payment.
 */

/**
 * The day boundary every figure is measured against. The platform serves the South
 * Omo area, so a "day" is a day there, not a UTC day and not the web server's
 * local day. Both the page and the exports state this, because the same records
 * fall into different reports under a different boundary.
 */
export const REPORT_TIMEZONE = 'Africa/Addis_Ababa';

/** A custom window longer than this is refused rather than silently summarised. */
const MAX_WINDOW_DAYS = 366;

const DAY_MS = 86_400_000;

export type ReportRangeKind = 'day' | 'week' | 'custom';

export type ReportRange = {
  kind: ReportRangeKind;
  /** Inclusive instant. */
  fromIso: string;
  /** Exclusive instant: the start of the day after the last one counted. */
  toIso: string;
  /** First calendar day counted, in the reporting zone. */
  fromDay: string;
  /** Last calendar day counted, in the reporting zone. */
  toDay: string;
  /** True when the caller asked for a custom window that could not be read. */
  invalidCustom: boolean;
};

export type ReportFilters = {
  status: string;
  sellerId: string;
  categoryId: string;
  provider: string;
};

export const EMPTY_FILTERS: ReportFilters = { status: '', sellerId: '', categoryId: '', provider: '' };

/** Reads filters off a query string, ignoring anything that is not a single value. */
export function parseReportFilters(params: Record<string, string | string[] | undefined>): ReportFilters {
  const one = (key: string): string => {
    const value = params[key];
    return typeof value === 'string' ? value.trim() : '';
  };
  return { status: one('status'), sellerId: one('seller'), categoryId: one('category'), provider: one('provider') };
}

function offsetMsInZone(timeZone: string, instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes): number =>
    Number.parseInt(parts.find((part) => part.type === type)?.value ?? '0', 10);
  const wallClock = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'));
  return wallClock - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The calendar day an instant falls on in the reporting zone, as `YYYY-MM-DD`. */
export function dayKeyInZone(iso: string, timeZone = REPORT_TIMEZONE): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const shifted = new Date(date.getTime() + offsetMsInZone(timeZone, date));
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`;
}

function addDays(dayKey: string, amount: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day) + amount * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The UTC instant that starts a calendar day in the reporting zone. The offset is
 * read twice because a zone can change its offset across a boundary; the second
 * pass corrects the guess. Ethiopia has no such change, but nothing here assumes
 * that, so the report stays right if it is run against another zone.
 */
function startOfDayUtcMs(dayKey: string, timeZone = REPORT_TIMEZONE): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  const wallClock = Date.UTC(year, month - 1, day);
  const once = wallClock - offsetMsInZone(timeZone, new Date(wallClock));
  return wallClock - offsetMsInZone(timeZone, new Date(once));
}

function dayKeysBetween(fromDay: string, toDay: string): string[] {
  const keys: string[] = [];
  let cursor = fromDay;
  for (let guard = 0; guard <= MAX_WINDOW_DAYS && cursor <= toDay; guard += 1) {
    keys.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/**
 * Turns the query string into one honest window. A custom range that is malformed,
 * reversed, or longer than a year falls back to today and says so, rather than
 * printing a figure for a window nobody asked for.
 */
export function resolveRange(input: {
  kind?: string;
  from?: string;
  to?: string;
  nowIso: string;
  timeZone?: string;
}): ReportRange {
  const timeZone = input.timeZone ?? REPORT_TIMEZONE;
  const today = dayKeyInZone(input.nowIso, timeZone);
  const day = (kind: ReportRangeKind, fromDay: string, toDay: string, invalidCustom = false): ReportRange => ({
    kind,
    fromIso: new Date(startOfDayUtcMs(fromDay, timeZone)).toISOString(),
    toIso: new Date(startOfDayUtcMs(addDays(toDay, 1), timeZone)).toISOString(),
    fromDay,
    toDay,
    invalidCustom
  });

  const inWindow = /^\d{4}-\d{2}-\d{2}$/;
  if (input.kind === 'custom' && inWindow.test(input.from ?? '') && inWindow.test(input.to ?? '')) {
    let fromDay = input.from as string;
    let toDay = input.to as string;
    if (fromDay > toDay) [fromDay, toDay] = [toDay, fromDay];
    const span = (startOfDayUtcMs(toDay, timeZone) - startOfDayUtcMs(fromDay, timeZone)) / DAY_MS + 1;
    if (span >= 1 && span <= MAX_WINDOW_DAYS) return day('custom', fromDay, toDay);
  }
  if (input.kind === 'custom') return day('day', today, today, true);
  if (input.kind === 'week') return day('week', addDays(today, -6), today);
  return day('day', today, today);
}

/**
 * Which instant places a payment in the window. A confirmed payment is reported
 * when it was confirmed, a closed attempt when it closed, and an attempt still
 * awaiting its outcome when it was opened — so a day's revenue is the money
 * confirmed that day, not money that was asked for that day.
 */
export function paymentWindowInstant(payment: Payment): string {
  if (payment.status === 'confirmed') return payment.confirmedAt ?? payment.updatedAt ?? payment.createdAt;
  if (payment.status === 'pending') return payment.createdAt;
  return payment.closedAt ?? payment.updatedAt ?? payment.createdAt;
}

/**
 * One row per payment reference. If two stored rows ever carried the same
 * reference, the one last touched wins: a repeated notification must not become a
 * second payment in a financial report.
 */
export function uniqueByReference(payments: Payment[]): Payment[] {
  const byReference = new Map<string, Payment>();
  for (const payment of payments) {
    const existing = byReference.get(payment.reference);
    if (!existing || (existing.updatedAt ?? existing.createdAt) <= (payment.updatedAt ?? payment.createdAt)) {
      byReference.set(payment.reference, payment);
    }
  }
  return [...byReference.values()];
}

export type ReportRow = {
  paymentReference: string;
  providerReference: string;
  inquiryReference: string;
  inquiryId: string;
  listingId: string;
  sellerProfileId: string;
  sellerName: string;
  listingTitle: string;
  categoryName: string;
  provider: PaymentProviderId;
  status: PaymentStatus;
  amountCents: number;
  feeCents: number | undefined;
  openedAt: string;
  confirmedAt: string;
  outcomeAt: string;
  outcomeDay: string;
  isDemo: boolean;
};

export type ReportTotals = {
  inquiries: number;
  attempts: number;
  confirmed: number;
  paidInquiries: number;
  revenueCents: number;
  awaiting: number;
  closed: number;
  refunded: number;
  refundedCents: number;
  feeCents: number;
  demoRows: number;
};

export type ReportGroup = {
  id: string;
  label: string;
  inquiries: number;
  attempts: number;
  confirmed: number;
  revenueCents: number;
};

export type ReportDay = {
  day: string;
  inquiries: number;
  attempts: number;
  confirmed: number;
  revenueCents: number;
};

export type BusinessReport = {
  range: ReportRange;
  filters: ReportFilters;
  rows: ReportRow[];
  totals: ReportTotals;
  byStatus: { status: PaymentStatus; count: number; amountCents: number; countsAsRevenue: boolean }[];
  byDay: ReportDay[];
  bySeller: ReportGroup[];
  byCategory: ReportGroup[];
  byProvider: ReportGroup[];
  generatedAt: string;
  /** Any row, inquiry or listing in the window is simulated demo data. */
  containsSampleData: boolean;
};

export type ReportSource = {
  payments: Payment[];
  inquiries: Inquiry[];
  listings: Listing[];
  profiles: Profile[];
  categories: Category[];
};

const CLOSED_STATUSES: PaymentStatus[] = ['failed', 'cancelled', 'expired'];

function inRange(iso: string, range: ReportRange): boolean {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return false;
  return time >= new Date(range.fromIso).getTime() && time < new Date(range.toIso).getTime();
}

/**
 * Builds the report. `range` is measured in the reporting zone; every figure is
 * derived from the records passed in, never from a number a browser sent.
 */
export function buildBusinessReport(input: {
  source: ReportSource;
  range: ReportRange;
  filters?: ReportFilters;
  nowIso: string;
}): BusinessReport {
  const { source, range } = input;
  const filters = input.filters ?? EMPTY_FILTERS;

  const inquiryById = new Map(source.inquiries.map((inquiry) => [inquiry.id, inquiry]));
  const listingById = new Map(source.listings.map((listing) => [listing.id, listing]));
  const profileById = new Map(source.profiles.map((profile) => [profile.id, profile]));
  const categoryById = new Map(source.categories.map((category) => [category.id, category]));

  const sellerName = (profileId: string): string => profileById.get(profileId)?.displayName || profileId || '—';
  const categoryName = (categoryId: string | undefined): string =>
    (categoryId ? categoryById.get(categoryId)?.name : undefined) ?? '—';

  // Seller and category belong to the arrangement, so both filter inquiries and
  // payments. An inquiry names no seller of its own — the listing it was sent to
  // does — so both are resolved through the listing.
  // Status and provider only describe a payment attempt: applying them to the
  // inquiry count would hide requests nobody has paid for yet, so the page says
  // which filters touch which figures.
  const producerOf = (listingId: string): string => listingById.get(listingId)?.producerId ?? '';
  const matchesSeller = (sellerProfileId: string): boolean => !filters.sellerId || sellerProfileId === filters.sellerId;
  const matchesCategory = (listingId: string): boolean => {
    if (!filters.categoryId) return true;
    return listingById.get(listingId)?.categoryId === filters.categoryId;
  };

  const inquiries = source.inquiries.filter(
    (inquiry) =>
      inRange(inquiry.createdAt, range) &&
      matchesSeller(producerOf(inquiry.listingId)) &&
      matchesCategory(inquiry.listingId)
  );

  const payments = uniqueByReference(source.payments).filter(
    (payment) =>
      inRange(paymentWindowInstant(payment), range) &&
      matchesSeller(payment.sellerProfileId) &&
      matchesCategory(payment.listingId) &&
      (!filters.status || payment.status === filters.status) &&
      (!filters.provider || payment.provider === filters.provider)
  );

  const rows: ReportRow[] = payments
    .map((payment) => {
      const inquiry = inquiryById.get(payment.inquiryId);
      const listing = listingById.get(payment.listingId);
      const outcomeAt = paymentWindowInstant(payment);
      return {
        paymentReference: payment.reference,
        providerReference: payment.providerReference ?? '',
        inquiryReference: inquiry?.reference ?? payment.inquiryId,
        inquiryId: payment.inquiryId,
        listingId: payment.listingId,
        sellerProfileId: payment.sellerProfileId,
        sellerName: sellerName(payment.sellerProfileId),
        listingTitle: listing?.title ?? '—',
        categoryName: categoryName(listing?.categoryId),
        provider: payment.provider,
        status: payment.status,
        amountCents: payment.amountCents,
        feeCents: typeof payment.feeCents === 'number' ? payment.feeCents : undefined,
        openedAt: payment.createdAt,
        confirmedAt: payment.confirmedAt ?? '',
        outcomeAt,
        outcomeDay: dayKeyInZone(outcomeAt),
        isDemo: payment.isDemo || Boolean(inquiry?.isDemo)
      };
    })
    .sort((a, b) => (a.outcomeAt < b.outcomeAt ? 1 : a.outcomeAt > b.outcomeAt ? -1 : a.paymentReference.localeCompare(b.paymentReference)));

  const confirmedRows = rows.filter((row) => row.status === 'confirmed');
  const refundedRows = rows.filter((row) => row.status === 'refunded');

  const totals: ReportTotals = {
    inquiries: inquiries.length,
    attempts: rows.length,
    confirmed: confirmedRows.length,
    // Distinct arrangements, so a buyer who tried twice and paid once is one sale.
    paidInquiries: new Set(confirmedRows.map((row) => row.inquiryId)).size,
    revenueCents: confirmedRows.reduce((sum, row) => sum + row.amountCents, 0),
    awaiting: rows.filter((row) => row.status === 'pending').length,
    closed: rows.filter((row) => CLOSED_STATUSES.includes(row.status)).length,
    refunded: refundedRows.length,
    refundedCents: refundedRows.reduce((sum, row) => sum + row.amountCents, 0),
    feeCents: confirmedRows.reduce((sum, row) => sum + (row.feeCents ?? 0), 0),
    demoRows: rows.filter((row) => row.isDemo).length
  };

  const byStatus = (['pending', 'confirmed', 'failed', 'cancelled', 'expired', 'refunded'] as PaymentStatus[])
    .map((status) => {
      const matching = rows.filter((row) => row.status === status);
      return {
        status,
        count: matching.length,
        amountCents: matching.reduce((sum, row) => sum + row.amountCents, 0),
        countsAsRevenue: status === 'confirmed'
      };
    })
    .filter((entry) => entry.count > 0);

  const group = (entries: Map<string, { label: string; inquiries: string[]; rows: ReportRow[] }>): ReportGroup[] =>
    [...entries.entries()]
      .map(([id, entry]) => {
        const confirmed = entry.rows.filter((row) => row.status === 'confirmed');
        return {
          id,
          label: entry.label,
          inquiries: entry.inquiries.length,
          attempts: entry.rows.length,
          confirmed: confirmed.length,
          revenueCents: confirmed.reduce((sum, row) => sum + row.amountCents, 0)
        };
      })
      .sort((a, b) => b.revenueCents - a.revenueCents || b.attempts - a.attempts || a.label.localeCompare(b.label));

  const sellerEntries = new Map<string, { label: string; inquiries: string[]; rows: ReportRow[] }>();
  const push = (
    into: Map<string, { label: string; inquiries: string[]; rows: ReportRow[] }>,
    id: string,
    label: string,
    inquiryId: string | null,
    row: ReportRow | null
  ): void => {
    const existing = into.get(id) ?? { label, inquiries: [], rows: [] };
    if (inquiryId && !existing.inquiries.includes(inquiryId)) existing.inquiries.push(inquiryId);
    if (row) existing.rows.push(row);
    into.set(id, existing);
  };

  for (const inquiry of inquiries) {
    const sellerId = producerOf(inquiry.listingId);
    push(sellerEntries, sellerId, sellerName(sellerId), inquiry.id, null);
  }
  for (const row of rows) {
    push(sellerEntries, row.sellerProfileId, row.sellerName, row.inquiryId, row);
  }

  const categoryEntries = new Map<string, { label: string; inquiries: string[]; rows: ReportRow[] }>();
  const categoryOf = (listingId: string): { id: string; label: string } => {
    const categoryId = listingById.get(listingId)?.categoryId ?? '';
    return { id: categoryId || 'unknown', label: categoryName(categoryId || undefined) };
  };
  for (const inquiry of inquiries) {
    const key = categoryOf(inquiry.listingId);
    push(categoryEntries, key.id, key.label, inquiry.id, null);
  }
  for (const row of rows) {
    const key = categoryOf(row.listingId);
    push(categoryEntries, key.id, key.label, row.inquiryId, row);
  }

  const providerEntries = new Map<string, { label: string; inquiries: string[]; rows: ReportRow[] }>();
  for (const row of rows) {
    push(providerEntries, row.provider, PROVIDER_LABELS[row.provider], row.inquiryId, row);
  }

  const dayEntries = new Map<string, ReportDay>();
  for (const key of dayKeysBetween(range.fromDay, range.toDay)) {
    dayEntries.set(key, { day: key, inquiries: 0, attempts: 0, confirmed: 0, revenueCents: 0 });
  }
  const at = (day: string): ReportDay => {
    const existing = dayEntries.get(day);
    if (existing) return existing;
    const created: ReportDay = { day, inquiries: 0, attempts: 0, confirmed: 0, revenueCents: 0 };
    dayEntries.set(day, created);
    return created;
  };
  for (const inquiry of inquiries) {
    at(dayKeyInZone(inquiry.createdAt)).inquiries += 1;
  }
  for (const row of rows) {
    const entry = at(row.outcomeDay);
    entry.attempts += 1;
    if (row.status === 'confirmed') {
      entry.confirmed += 1;
      entry.revenueCents += row.amountCents;
    }
  }

  // A simulated payment or demo inquiry is labelled; so is a row whose listing is
  // itself sample data, because its figures would otherwise look real.
  const sampleData =
    rows.some((row) => row.isDemo || listingById.get(row.listingId)?.isDemo === true) ||
    inquiries.some((inquiry) => inquiry.isDemo);

  return {
    range,
    filters,
    rows,
    totals,
    byStatus,
    byDay: [...dayEntries.values()].sort((a, b) => a.day.localeCompare(b.day)),
    bySeller: group(sellerEntries),
    byCategory: group(categoryEntries),
    byProvider: group(providerEntries),
    generatedAt: input.nowIso,
    containsSampleData: sampleData
  };
}

/* ---------------------------------------------------------------- exports -- */

const CSV_COLUMNS = [
  'payment_reference',
  'provider_reference',
  'inquiry_reference',
  'seller_profile_id',
  'seller_name',
  'listing_title',
  'category_name',
  'provider',
  'status',
  'amount_cents',
  'amount',
  'fee_cents',
  'counts_as_revenue',
  'opened_at_utc',
  'confirmed_at_utc',
  'outcome_at_utc',
  'outcome_day_addis',
  'window_start_utc',
  'window_end_utc',
  'reporting_time_zone',
  'simulated_demo_data'
] as const;

function csvCell(value: string | number | boolean): string {
  const raw = String(value);
  // A leading = + - @ or a tab turns a cell into a formula in a spreadsheet
  // program. Seller and listing text comes from accounts, so it is neutralised
  // rather than trusted.
  const guarded = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
  return /[",\n\r]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
}

/**
 * One line per payment attempt in the window, plus the window itself on every row
 * so an exported file cannot be read as a total for a period nobody chose. Counts
 * as revenue is written per row: a spreadsheet total can then be made from the
 * confirmed rows only, which is the same rule the page uses.
 */
export function reportCsv(report: BusinessReport): string {
  const lines = [CSV_COLUMNS.join(',')];
  for (const row of report.rows) {
    lines.push(
      [
        row.paymentReference,
        row.providerReference,
        row.inquiryReference,
        row.sellerProfileId,
        row.sellerName,
        row.listingTitle,
        row.categoryName,
        row.provider,
        row.status,
        row.amountCents,
        formatMoney({ cents: row.amountCents, currency: 'ETB' }),
        row.feeCents ?? '',
        row.status === 'confirmed',
        row.openedAt,
        row.confirmedAt,
        row.outcomeAt,
        row.outcomeDay,
        report.range.fromIso,
        report.range.toIso,
        REPORT_TIMEZONE,
        row.isDemo
      ]
        .map(csvCell)
        .join(',')
    );
  }
  return `${lines.join('\r\n')}\r\n`;
}

export type ReportTable = {
  heading: string;
  columns: string[];
  rows: string[][];
  /** Widths for every column but the first, which takes what is left. */
  tailWidths: number[];
};

export type ReportDocument = {
  title: string;
  claim: string;
  windowLine: string;
  generatedAt: string;
  summary: { label: string; value: string }[];
  tables: ReportTable[];
  notices: string[];
  isDemo: boolean;
  requestedLanguage: LanguageCode;
  printedLanguage: LanguageCode;
  fileName: string;
};

function utcDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`;
}

export function reportFileName(range: ReportRange): string {
  const safe = `omonettab-report-${range.fromDay}-to-${range.toDay}`.replace(/[^A-Za-z0-9._-]/g, '-');
  return `${safe}.pdf`;
}

/**
 * The printable form of a report: the same figures, in the visitor's language
 * where the font can draw it. Table text is trimmed to fit the page — an
 * administrator who needs every row uses the CSV, and the PDF says so.
 */
export function buildReportDocument(input: {
  report: BusinessReport;
  lang: LanguageCode;
  maxRowsPerTable?: number;
}): ReportDocument {
  const { report } = input;
  const maxRows = input.maxRowsPerTable ?? 25;
  const { printedLanguage, fallbackReason } = printableLanguage(input.lang);
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(printedLanguage, key, vars);
  const money = (cents: number) => formatMoney({ cents, currency: 'ETB' });

  const rangeLabel =
    report.range.kind === 'day'
      ? tr('reports.daily')
      : report.range.kind === 'week'
        ? tr('reports.weekly')
        : tr('reports.custom');

  const summary: ReportDocument['summary'] = [
    { label: tr('reports.range'), value: `${report.range.fromDay} to ${report.range.toDay}` },
    { label: tr('reports.inquiries'), value: String(report.totals.inquiries) },
    { label: tr('reports.attempts'), value: String(report.totals.attempts) },
    { label: tr('reports.confirmed'), value: String(report.totals.confirmed) },
    { label: tr('reports.paidInquiries'), value: String(report.totals.paidInquiries) },
    { label: tr('reports.revenue'), value: money(report.totals.revenueCents) },
    { label: tr('reports.awaiting'), value: String(report.totals.awaiting) },
    { label: tr('reports.closed'), value: String(report.totals.closed) },
    { label: tr('reports.refunded'), value: `${report.totals.refunded} · ${money(report.totals.refundedCents)}` },
    { label: tr('reports.fees'), value: money(report.totals.feeCents) }
  ];

  const trimmed = <T,>(rows: T[], note: (omitted: number) => string, sink: string[]): T[] => {
    if (rows.length <= maxRows) return rows;
    sink.push(note(rows.length - maxRows));
    return rows.slice(0, maxRows);
  };
  const omittedNotes: string[] = [];

  const tables: ReportTable[] = [
    {
      heading: tr('reports.status'),
      columns: [tr('reports.status'), tr('reports.count'), tr('reports.amount'), tr('reports.countsAsRevenue')],
      tailWidths: [90, 110, 110],
      rows: trimmed(
        report.byStatus.map((entry) => [
          tr(`payment.status.${entry.status}`),
          String(entry.count),
          money(entry.amountCents),
          entry.countsAsRevenue ? tr('reports.yes') : tr('reports.no')
        ]),
        (omitted) => tr('reports.rowsOmitted', { table: tr('reports.status'), omitted }),
        omittedNotes
      )
    },
    {
      heading: tr('reports.byDay'),
      columns: [tr('reports.day'), tr('reports.inquiries'), tr('reports.attempts'), tr('reports.confirmed'), tr('reports.revenue')],
      tailWidths: [90, 90, 90, 110],
      rows: trimmed(
        report.byDay.map((entry) => [
          entry.day,
          String(entry.inquiries),
          String(entry.attempts),
          String(entry.confirmed),
          money(entry.revenueCents)
        ]),
        (omitted) => tr('reports.rowsOmitted', { table: tr('reports.byDay'), omitted }),
        omittedNotes
      )
    },
    {
      heading: tr('reports.bySeller'),
      columns: [tr('reports.seller'), tr('reports.inquiries'), tr('reports.attempts'), tr('reports.confirmed'), tr('reports.revenue')],
      tailWidths: [80, 80, 80, 110],
      rows: trimmed(
        report.bySeller.map((entry) => [
          entry.label,
          String(entry.inquiries),
          String(entry.attempts),
          String(entry.confirmed),
          money(entry.revenueCents)
        ]),
        (omitted) => tr('reports.rowsOmitted', { table: tr('reports.bySeller'), omitted }),
        omittedNotes
      )
    },
    {
      heading: tr('reports.byCategory'),
      columns: [tr('reports.category'), tr('reports.inquiries'), tr('reports.attempts'), tr('reports.confirmed'), tr('reports.revenue')],
      tailWidths: [80, 80, 80, 110],
      rows: trimmed(
        report.byCategory.map((entry) => [
          entry.label,
          String(entry.inquiries),
          String(entry.attempts),
          String(entry.confirmed),
          money(entry.revenueCents)
        ]),
        (omitted) => tr('reports.rowsOmitted', { table: tr('reports.byCategory'), omitted }),
        omittedNotes
      )
    },
    {
      heading: tr('reports.byProvider'),
      columns: [tr('reports.provider'), tr('reports.attempts'), tr('reports.confirmed'), tr('reports.revenue')],
      tailWidths: [90, 90, 110],
      rows: trimmed(
        report.byProvider.map((entry) => [
          entry.label,
          String(entry.attempts),
          String(entry.confirmed),
          money(entry.revenueCents)
        ]),
        (omitted) => tr('reports.rowsOmitted', { table: tr('reports.byProvider'), omitted }),
        omittedNotes
      )
    },
    {
      heading: tr('reports.paymentRows'),
      columns: [tr('reports.reference'), tr('reports.inquiryRef'), tr('reports.seller'), tr('reports.status'), tr('reports.amount'), tr('reports.simulated')],
      tailWidths: [130, 90, 110, 80, 60],
      rows: trimmed(
        report.rows.map((row) => [
          row.paymentReference,
          row.inquiryReference,
          row.sellerName,
          tr(`payment.status.${row.status}`),
          money(row.amountCents),
          row.isDemo ? tr('reports.yes') : tr('reports.no')
        ]),
        (omitted) => tr('reports.rowsOmitted', { table: tr('reports.paymentRows'), omitted }),
        omittedNotes
      )
    }
  ];

  const notices: string[] = [
    tr('reports.countingRules'),
    tr('reports.timezoneNote', { timeZone: REPORT_TIMEZONE }),
    tr('reports.csvNote')
  ];
  if (report.filters.status || report.filters.provider) notices.push(tr('reports.inquiryFilterNote'));
  if (report.range.invalidCustom) notices.push(tr('reports.invalidCustom'));
  if (report.containsSampleData) {
    notices.push(tr('reports.demoRows', { count: report.totals.demoRows }));
  }
  notices.push(...omittedNotes);
  if (fallbackReason === 'script') notices.push(tr('receipt.languageNote.font'));
  if (fallbackReason === 'dictionary') notices.push(tr('receipt.languageNote.untranslated'));

  return {
    title: `${rangeLabel} — ${tr('reports.title')}`,
    claim: tr('reports.pdfClaim'),
    windowLine: `${report.range.fromDay} to ${report.range.toDay} (${REPORT_TIMEZONE})`,
    generatedAt: utcDateTime(report.generatedAt),
    summary,
    tables,
    notices,
    isDemo: report.containsSampleData,
    requestedLanguage: input.lang,
    printedLanguage,
    fileName: reportFileName(report.range)
  };
}

/** Draws the report with the same A4 engine the receipts use. */
export async function renderReportPdf(document: ReportDocument): Promise<Uint8Array> {
  const writer = await Writer.create();
  const tr = (key: TranslationKey, vars?: Record<string, string | number>) => t(document.printedLanguage, key, vars);
  const draw = (value: string) => toWinAnsi(value).text;

  writer.doc.setTitle(draw(`${document.title}`));
  writer.doc.setAuthor('OmoNetTab');
  writer.doc.setSubject(draw(document.windowLine));
  writer.doc.setCreator('OmoNetTab');
  writer.doc.setProducer('OmoNetTab');
  const createdAt = new Date(document.generatedAt);
  if (!Number.isNaN(createdAt.getTime())) writer.doc.setCreationDate(createdAt);

  writer.headerBand(
    draw('OmoNetTab'),
    draw(tr('brand.tagline')),
    [draw(`${tr('reports.range')}: ${document.windowLine}`), draw(`${tr('receipt.generatedAt')}: ${document.generatedAt}`)]
  );

  writer.banner(draw(document.title), draw(document.claim), CLAY);

  if (document.isDemo) writer.stamp(draw(tr('reports.demoStamp')));

  writer.sectionTitle(draw(tr('reports.summaryHeading')));
  for (const line of document.summary) {
    writer.keyLine(draw(line.label), draw(line.value), { boldValue: false });
  }

  for (const table of document.tables) {
    writer.space(6);
    writer.sectionTitle(draw(table.heading));
    const widths = [CONTENT_WIDTH - table.tailWidths.reduce((sum, width) => sum + width, 0), ...table.tailWidths];
    const rows = table.rows.length > 0 ? table.rows : [table.columns.map(() => '—')];
    writer.columns(
      table.columns.map(draw),
      rows.map((cells) => cells.map(draw)),
      widths,
      9
    );
  }

  writer.space(6);
  writer.rule();
  writer.sectionTitle(draw(tr('receipt.notesHeading')));
  const notices = [...document.notices];
  if (countUnrepresentable(document) > 0) notices.push(tr('receipt.charsetNote'));
  for (const notice of notices) {
    writer.paragraph(draw(notice), { size: 8.8, color: MUTED });
    writer.space(3);
  }

  return writer.finish(
    [`OmoNetTab — ${tr('brand.tagline')}`, tr('receipt.footerRegenerate')],
    (page, pages) => draw(tr('receipt.pageOf', { page, pages }))
  );
}

/**
 * Counts characters the embedded font cannot draw. The stored record keeps the
 * original text, but a printed name that became `?` has to be admitted on the
 * page rather than left for the reader to notice.
 */
function countUnrepresentable(document: ReportDocument): number {
  const all = [
    document.title,
    document.claim,
    document.windowLine,
    ...document.summary.flatMap((line) => [line.label, line.value]),
    ...document.tables.flatMap((table) => [table.heading, ...table.columns, ...table.rows.flat()]),
    ...document.notices
  ];
  return all.reduce((total, value) => total + toWinAnsi(value).replaced, 0);
}
