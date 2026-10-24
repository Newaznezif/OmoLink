import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { getLanguage, getT } from '@/lib/i18n/server';
import type { TranslationKey } from '@/lib/i18n';
import { ArrangementCard, arrangementTone } from '@/components/arrangement-card';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

const STATUSES = ['new', 'accepted', 'awaiting_confirmation', 'fulfillment_arranged', 'completed', 'cancelled'] as const;

const STATUS_WORD: Record<string, TranslationKey> = {
  new: 'inquiries.statusWord.new',
  accepted: 'inquiries.statusWord.accepted',
  awaiting_confirmation: 'inquiries.statusWord.awaiting_confirmation',
  fulfillment_arranged: 'inquiries.statusWord.fulfillment_arranged',
  completed: 'inquiries.statusWord.completed',
  cancelled: 'inquiries.statusWord.cancelled'
};

export async function generateMetadata() {
  const tr = getT();
  return {
    title: tr('nav.myInquiries'),
    description: tr('buyerInquiries.metaDescription')
  };
}

export default async function BuyerInquiriesPage({ searchParams }: { searchParams?: SearchParams }) {
  const actor = await requireArea('/buyer', ['buyer']);
  const text = (key: string): string => (typeof searchParams?.[key] === 'string' ? (searchParams[key] as string) : '');
  const repo = getRepo();
  const lang = getLanguage();
  const tr = getT();
  const [inquiries, listings] = await Promise.all([
    repo.listInquiriesForBuyer(actor.profileId),
    repo.listAllListings()
  ]);

  const listingById = new Map(listings.map((l) => [l.id, l]));
  const q = text('q').trim().toLowerCase();
  const status = text('status');

  const rows = inquiries
    .filter((i) => {
      if (status && i.status !== status) return false;
      if (!q) return true;
      return [i.reference, i.message, listingById.get(i.listingId)?.title ?? ''].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const counts = STATUSES.map((s) => ({ status: s, count: inquiries.filter((i) => i.status === s).length }));

  return (
    <Section
      eyebrow={tr('nav.myAccountAria')}
      title={tr('nav.myInquiries')}
      description={tr('buyerInquiries.description')}
    >
      {inquiries.length > 0 && (
        <Card>
          <CardBody>
            <div className="flex flex-wrap gap-2">
              {counts.map((c) => (
                <Link key={c.status} href={`/buyer/inquiries?status=${c.status}`}>
                  <Badge tone={arrangementTone(c.status)}>
                    {tr(STATUS_WORD[c.status])} · {c.count}
                  </Badge>
                </Link>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <Field label={tr('buyerInquiries.searchLabel')} htmlFor="q">
              <Input id="q" name="q" defaultValue={text('q')} />
            </Field>
            <Field label={tr('reports.status')} htmlFor="status">
              <Select id="status" name="status" defaultValue={status}>
                <option value="">{tr('common.any')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {tr(STATUS_WORD[s])}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="md:col-span-2 flex items-end gap-2">
              <Button type="submit" size="sm">
                {tr('buyerInquiries.apply')}
              </Button>
              <Link
                href="/buyer/inquiries"
                className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-9 text-sm font-semibold inline-flex items-center"
              >
                {tr('common.clear')}
              </Link>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title={inquiries.length === 0 ? tr('inquiries.emptyTitle') : tr('buyerInquiries.noMatchTitle')}
          body={
            inquiries.length === 0
              ? tr('buyerInquiries.emptyBody')
              : tr('buyerInquiries.noMatchBody')
          }
          action={
            inquiries.length === 0 ? (
              <Link href="/explore" className="underline font-semibold text-clay-700">
                {tr('buyerInquiries.browseMarketplace')}
              </Link>
            ) : (
              <Link href="/buyer/inquiries" className="underline font-semibold text-clay-700">
                {tr('buyerInquiries.showAll')}
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {rows.map((i) => (
            <div key={i.id}>
              <ArrangementCard inquiry={i} listing={listingById.get(i.listingId)} canAct={actor.status === 'active'} lang={lang} />
              <p className="mt-1 px-1 text-sm">
                <Link href={`/buyer/inquiries/${i.id}`} className="underline font-semibold text-clay-700">
                  {tr('buyerInquiries.openThisRecord')}
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
