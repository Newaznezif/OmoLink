import { Section, Card, CardBody, LinkButton } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default function AccessDeniedPage() {
  const t = getT();
  return (
    <Section
      eyebrow={t('accessDenied.eyebrow')}
      title={t('accessDenied.title')}
      description={t('accessDenied.description')}
    >
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-ink-700">{t('accessDenied.body')}</p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/dashboard">{t('accessDenied.dashboard')}</LinkButton>
            <LinkButton href="/buyer" variant="secondary">
              {t('accessDenied.buyerArea')}
            </LinkButton>
            <LinkButton href="/" variant="ghost">
              {t('notFound.backHome')}
            </LinkButton>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}
