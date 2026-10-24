import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const t = getT();
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: t('apiReports.invalidJson') }, { status: 400 });
  }
  const input = (body ?? {}) as Record<string, unknown>;
  if (typeof input.listingId !== 'string' || typeof input.reason !== 'string' || typeof input.reporterName !== 'string' || typeof input.reporterContact !== 'string') {
    return NextResponse.json({ error: t('apiReports.missingFields') }, { status: 400 });
  }
  if (input.reason.length > 2000 || input.reporterName.length > 200 || input.reporterContact.length > 200) {
    return NextResponse.json({ error: t('apiReports.tooLong') }, { status: 400 });
  }
  const repo = getRepo();
  const listing = await repo.getListing(input.listingId);
  if (!listing) return NextResponse.json({ error: t('apiReports.listingNotFound') }, { status: 404 });
  const report = await repo.createReport({
    listingId: listing.id,
    reason: input.reason,
    reporterName: input.reporterName,
    reporterContact: input.reporterContact
  });
  return NextResponse.json({ report }, { status: 201 });
}
