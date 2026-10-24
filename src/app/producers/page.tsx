import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getT } from '@/lib/i18n/server';
import { Badge, Button, Card, CardBody, Empty, Field, Input, Select, Section } from '@/components/ui';
import { VerificationLabel } from '@/components/status-labels';
import { ProducerCard } from '@/components/producer-card';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export async function generateMetadata() {
  const t = getT();
  return {
    title: t('producers.sellersAndGuidesTitle'),
    description: t('producers.sellersAndGuidesDescription')
  };
}

export default async function ProducersPage({ searchParams }: { searchParams?: SearchParams }) {
  const t = getT();
  const text = (key: string): string => {
    const value = searchParams?.[key];
    return typeof value === 'string' ? value : '';
  };
  const repo = getRepo();
  const [profiles, listings, categories, groups] = await Promise.all([
    repo.listPublicProfiles(),
    repo.listPublicListings(),
    repo.listCategories(),
    repo.listGroups()
  ]);

  const q = text('q').trim().toLowerCase();
  const categoryId = text('category');
  const verifiedOnly = text('verification') === 'verified';
  const groupOnly = text('type') === 'group';

  const listingCount = new Map<string, number>();
  const kindsByProducer = new Map<string, Set<string>>();
  for (const l of listings) {
    listingCount.set(l.producerId, (listingCount.get(l.producerId) ?? 0) + 1);
    const set = kindsByProducer.get(l.producerId) ?? new Set<string>();
    set.add(l.kind);
    kindsByProducer.set(l.producerId, set);
  }
  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const rows = profiles.filter((p) => {
    if (verifiedOnly && p.verification !== 'verified') return false;
    if (groupOnly && !['producer_group', 'cooperative'].includes(p.producerType)) return false;
    if (categoryId && !p.categories.includes(categoryId)) return false;
    if (!q) return true;
    return [p.displayName, p.community, p.operatingArea, p.shortBio, p.organizationName ?? '']
      .join(' ')
      .toLowerCase()
      .includes(q);
  });

  return (
    <Section
      eyebrow={t('market.productsEyebrow')}
      title={t('producers.sellersTitle')}
      description={t('producers.sellersDescription')}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <Field label={t('producers.searchLabel')} htmlFor="q">
              <Input id="q" name="q" defaultValue={text('q')} />
            </Field>
            <Field label={t('filter.category')} htmlFor="category">
              <Select id="category" name="category" defaultValue={categoryId}>
                <option value="">{t('producers.allCategories')}</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t('producers.accountTypeLabel')} htmlFor="type">
              <Select id="type" name="type" defaultValue={text('type')}>
                <option value="">{t('producers.anyoneSells')}</option>
                <option value="group">{t('producers.groupsHeading')}</option>
              </Select>
            </Field>
            <Field label={t('producers.verificationLabel')} htmlFor="verification">
              <Select id="verification" name="verification" defaultValue={text('verification')}>
                <option value="">{t('producers.anyStatus')}</option>
                <option value="verified">{t('producers.verifiedOnly')}</option>
              </Select>
            </Field>
            <div className="md:col-span-4 flex flex-wrap items-end gap-2">
              <Button type="submit" size="sm">
                {t('filter.apply')}
              </Button>
              <Link
                href="/producers"
                className="rounded-lg border border-ink-100 bg-white px-4 py-2 min-h-9 text-sm font-semibold inline-flex items-center"
              >
                {t('common.clear')}
              </Link>
              <p className="text-sm text-ink-500">
                {t('producers.matchSummary', {
                  shown: rows.length,
                  total: profiles.length,
                  tail: profiles.length === 1 ? t('producers.matchTailOne') : t('producers.matchTailMany')
                })}
              </p>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title={t('producers.emptyTitle')}
          body={t('producers.emptyBody')}
          action={
            <Link href="/producers" className="underline font-semibold text-clay-700">
              {t('producers.showEveryone')}
            </Link>
          }
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((p) => (
            <div key={p.id}>
              <ProducerCard producer={p} />
              <div className="mt-1 px-1 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <VerificationLabel status={p.verification} isDemo={p.isDemo} />
                <span>
                  {t(listingCount.get(p.id) === 1 ? 'producers.listingOne' : 'producers.listingMany', {
                    count: listingCount.get(p.id) ?? 0
                  })}
                </span>
                {categoryId && categoryById.get(categoryId) && <Badge tone="info">{categoryById.get(categoryId)!.name}</Badge>}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <h2 className="text-xl font-bold text-ink-900">{t('producers.groupsHeading')}</h2>
        <p className="mt-1 text-sm text-ink-500">
          {t('producers.groupsIntro')}
        </p>
        {groups.length === 0 ? (
          <p className="mt-3 text-sm text-ink-700">{t('producers.noGroups')}</p>
        ) : (
          <ul className="mt-3 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {groups.map((g) => {
              const members = profiles.filter((p) => g.memberProfileIds.includes(p.id));
              return (
                <li key={g.id}>
                  <Card className="h-full">
                    <CardBody>
                      <h3 className="font-semibold text-ink-900">{g.name}</h3>
                      <p className="text-sm text-ink-500">{g.community}</p>
                      <p className="mt-2 text-sm text-ink-700">{g.description}</p>
                      <p className="mt-2 text-sm text-ink-700">
                        {members.length > 0
                          ? t('producers.publishedMembers', { names: members.map((m) => m.displayName).join(', ') })
                          : t('producers.noMembersYet')}
                      </p>
                      <p className="mt-2 text-xs text-ink-500">
                        <Link href="/collective-orders" className="underline font-semibold text-clay-700">
                          {t('producers.openGroupOrders')}
                        </Link>
                      </p>
                    </CardBody>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="mt-6 text-sm text-ink-700">
        {t('producers.sellingLead')}{' '}
        <Link href="/register" className="underline font-semibold text-clay-700">
          {t('producers.createAccountLink')}
        </Link>{' '}
        {t('producers.sellingMiddle')}{' '}
        <Link href="/how-it-works" className="underline font-semibold text-clay-700">
          {t('producers.howWorksLink')}
        </Link>
        .
      </p>
    </Section>
  );
}
