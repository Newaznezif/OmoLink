import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { getT } from '@/lib/i18n/server';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function ImpactPage() {
  const t = getT();
  const stats = await getRepo().aggregateStats();
  return (
    <Section eyebrow={t('footer.impact')} title={t('footer.impact')} description={t('impact.description')}>
      {stats.producers === 0 ? (
        <Empty title={t('impact.emptyTitle')} body={t('impact.emptyBody')} />
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Metric label={t('impact.activeProducers')} value={stats.producers} />
          <Metric label={t('impact.publishedListings')} value={stats.listings} />
          <Metric label={t('impact.buyerInquiries')} value={stats.inquiries} />
          <Metric label={t('nav.collective')} value={stats.opportunities} />
          <Metric label={t('impact.collectivePooled')} value={stats.collectiveContributed} />
          <Metric label={t('impact.collectiveTarget')} value={stats.collectiveTarget} />
          <Metric label={t('impact.verifiedProfiles')} value={stats.verified} />
          <Card>
            <CardBody>
              <h3 className="text-xs uppercase text-ink-500 font-semibold">{t('impact.completedTransactions')}</h3>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-3xl font-black text-ink-900">—</span>
                <Badge tone="warning">{t('impact.requiresReliableData')}</Badge>
              </div>
              <p className="mt-1 text-xs text-ink-500">
                {t('impact.noTransactionsNote')}
              </p>
            </CardBody>
          </Card>
        </div>
      )}

      <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('impact.measureTitle')}</h2>
            <ol className="mt-2 list-decimal pl-5 space-y-1 text-ink-700">
              <li>{t('impact.measure1')}</li>
              <li>{t('impact.measure2')}</li>
              <li>{t('impact.measure3')}</li>
              <li>{t('impact.measure4')}</li>
              <li>{t('impact.measure5')}</li>
            </ol>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{t('impact.willNotShowTitle')}</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>{t('impact.notShow1')}</li>
              <li>{t('impact.notShow2')}</li>
              <li>{t('impact.notShow3')}</li>
              <li>{t('impact.notShow4')}</li>
            </ul>
            <p className="mt-3 text-xs text-ink-500">
              {t('impact.seePrefix')}
              <Link href="/how-it-works" className="underline">
                {t('impact.howLink')}
              </Link>
              {t('impact.seeSuffix')}
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  const t = getT();
  return (
    <Card>
      <CardBody>
        <h3 className="text-xs uppercase text-ink-500 font-semibold">{label}</h3>
        <div className="mt-1 text-3xl font-black text-ink-900">{value}</div>
        <p className="mt-1 text-xs text-ink-500">{t('impact.sampleDataNote')}</p>
      </CardBody>
    </Card>
  );
}
