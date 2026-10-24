import { getRepo } from '@/lib/repo';
import { getLanguage, getT } from '@/lib/i18n/server';
import { authErrorResponse, requireRole } from '@/lib/session';
import {
  buildBusinessReport,
  buildReportDocument,
  parseReportFilters,
  renderReportPdf,
  reportCsv,
  reportFileName,
  resolveRange
} from '@/lib/business-reports';

export const dynamic = 'force-dynamic';

/**
 * Downloads the administrator's business report as CSV or PDF.
 *
 * The figures are rebuilt here from the stored records rather than taken from the
 * page the browser is looking at, so editing the URL can change which window is
 * reported but never what a downloaded total says. Authorisation is checked on
 * every request: the admin area's layout gate is not a boundary this route leans
 * on, because a download link can be opened directly.
 */
export async function GET(req: Request) {
  const t = getT();
  try {
    await requireRole('admin');
  } catch (err) {
    const { body, status } = authErrorResponse(err, t('apiExport.signInAdmin'));
    return Response.json(body, { status });
  }

  const url = new URL(req.url);
  const params = Object.fromEntries(url.searchParams.entries());
  const nowIso = new Date().toISOString();
  const value = (key: string): string | undefined => (typeof params[key] === 'string' ? params[key] : undefined);
  const range = resolveRange({ kind: value('range'), from: value('from'), to: value('to'), nowIso });
  const filters = parseReportFilters(params);

  const repo = getRepo();
  const [payments, inquiries, listings, profiles, categories] = await Promise.all([
    repo.listAllPayments(),
    repo.listAllInquiries(),
    repo.listAllListings(),
    repo.listAllProfiles(),
    repo.listAllCategories()
  ]);

  const report = buildBusinessReport({
    source: { payments, inquiries, listings, profiles, categories },
    range,
    filters,
    nowIso
  });

  const safeHeaders = {
    // A report about other people's transactions must not sit in a shared cache.
    'cache-control': 'private, no-store, max-age=0',
    'x-content-type-options': 'nosniff'
  };

  const format = value('format') ?? 'csv';

  if (format === 'csv') {
    // Spreadsheet programs read a BOM-less UTF-8 file as their own legacy code
    // page, which mangles the Amharic and Chinese names sellers actually use.
    const csv = `﻿${reportCsv(report)}`;
    const fileName = reportFileName(range).replace(/\.pdf$/, '.csv');
    return new Response(csv, {
      status: 200,
      headers: {
        ...safeHeaders,
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': `attachment; filename="${fileName}"`
      }
    });
  }

  if (format === 'pdf') {
    const document = buildReportDocument({ report, lang: getLanguage() });
    const pdf = await renderReportPdf(document);
    return new Response(pdf as unknown as BodyInit, {
      status: 200,
      headers: {
        ...safeHeaders,
        'content-type': 'application/pdf',
        'content-disposition': `attachment; filename="${document.fileName}"`
      }
    });
  }

  return Response.json(
    { error: t('apiExport.unknownFormat') },
    { status: 400, headers: safeHeaders }
  );
}
