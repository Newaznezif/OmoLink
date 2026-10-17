import { NextResponse } from 'next/server';
import { getRepo } from '@/lib/repo';

export const dynamic = 'force-dynamic';

/**
 * Public contact form endpoint. Anyone may send one message; there is no
 * authentication and no rate limit in this build, which is stated in the README
 * as a known limitation. The stored record is read only by administrators.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    email?: unknown;
    subject?: unknown;
    message?: unknown;
  };
  try {
    const record = await getRepo().createContactMessage({
      name: String(body.name ?? ''),
      email: String(body.email ?? ''),
      subject: String(body.subject ?? ''),
      message: String(body.message ?? '')
    });
    return NextResponse.json({ ok: true, id: record.id }, { status: 201 });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The message could not be saved.' },
      { status: 400 }
    );
  }
}
