import Link from 'next/link';
import { Section, LinkButton, Card, CardBody } from '@/components/ui';
import { getT } from '@/lib/i18n/server';

export default function NotFound() {
  const t = getT();
  return (
    <Section eyebrow={t('notFound.eyebrow')} title={t('notFound.title')} description={t('notFound.description')}>
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/">{t('notFound.backHome')}</LinkButton>
            <LinkButton href="/products" variant="secondary">
              {t('nav.products')}
            </LinkButton>
            <LinkButton href="/tourism" variant="secondary">
              {t('nav.tourism')}
            </LinkButton>
          </div>
          <p className="text-sm text-ink-700">
            {t('notFound.helpPrefix')}
            <Link href="/explore" className="underline font-semibold">{t('notFound.searchFilters')}</Link>
            {t('notFound.helpMiddle')}
            <Link href="/contact" className="underline font-semibold">{t('notFound.contact')}</Link>
            {t('notFound.helpSuffix')}
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
