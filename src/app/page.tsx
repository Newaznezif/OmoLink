import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import type { Category, CollectiveOpportunity, HomepageSectionId, Listing, Profile, SiteSettings } from '@/lib/types';
import type { TranslationKey } from '@/lib/i18n';
import { getLanguage, getT } from '@/lib/i18n/server';
import { categoryTexts } from '@/lib/i18n/catalog';
import { ListingCard } from '@/components/listing-card';
import { ProducerCard } from '@/components/producer-card';
import { Button, Card, CardBody, LinkButton, Section } from '@/components/ui';
import { CollectiveOpportunityCard } from '@/components/collective-card';
import { TeamMemberCard } from '@/components/team-card';
import { TEAM_MEMBERS } from '@/lib/team';

export const dynamic = 'force-dynamic';

/**
 * The homepage is administrator-manageable: text, which sections appear, in what
 * order, and which listings and producers are highlighted all come from the
 * stored site settings. Anything the admin has not chosen falls back to the
 * newest published records, so the page is never blank and never a dead shell.
 */
export default async function HomePage() {
  const repo = getRepo();
  const [settings, listings, profiles, opportunities, categories] = await Promise.all([
    repo.getSiteSettings(),
    repo.listPublicListings(),
    repo.listPublicProfiles(),
    repo.listOpportunities(),
    repo.listCategories()
  ]);

  const producerById = new Map<string, Profile>(profiles.map((p) => [p.id, p]));
  const pickListings = (ids: string[], kind: Listing['kind'], count: number): Listing[] => {
    const chosen = ids
      .map((id) => listings.find((l) => l.id === id))
      .filter((l): l is Listing => Boolean(l && l.kind === kind));
    const rest = listings.filter((l) => l.kind === kind && !chosen.includes(l));
    return [...chosen, ...rest].slice(0, count);
  };

  const featuredProducts = pickListings(settings.featuredProductIds, 'product', 3);
  const featuredTourism = pickListings(settings.featuredServiceIds, 'service', 2);
  const highlightedProducers = (() => {
    const chosen = settings.featuredProducerIds
      .map((id) => profiles.find((p) => p.id === id))
      .filter((p): p is Profile => Boolean(p));
    return [...chosen, ...profiles.filter((p) => !chosen.includes(p))].slice(0, 3);
  })();

  const blocks: Record<HomepageSectionId, () => React.ReactNode> = {
    hero: () => <HeroSection settings={settings} />,
    search: () => <SearchSection />,
    featured_products: () => (
      <FeaturedBlock
        titleKey="home.featuredProductsTitle"
        eyebrowKey="home.featuredProductsEyebrow"
        listings={featuredProducts}
        producerById={producerById}
        viewAllHref="/products"
      />
    ),
    featured_tourism: () => (
      <FeaturedBlock
        titleKey="home.featuredTourismTitle"
        eyebrowKey="home.featuredTourismEyebrow"
        listings={featuredTourism}
        producerById={producerById}
        viewAllHref="/tourism"
      />
    ),
    categories: () => <CategorySection categories={categories} />,
    producer_highlights: () => <ProducersSection producers={highlightedProducers} />,
    collective: () => (
      <>
        <CollectivePreview opportunities={openFirst(opportunities).slice(0, 2)} />
        <CollectiveExplainer />
      </>
    ),
    how_it_works: () => <HowItWorksTeaser />,
    team: () => <TeamPreview />,
    trust: () => <TrustSection />
  };

  const ordered = settings.homepageSections.filter((s) => s.visible && blocks[s.id]).map((s) => s.id);
  const visible = ordered.length > 0 ? ordered : (Object.keys(blocks) as HomepageSectionId[]);

  return (
    <>
      {settings.announcementBar.enabled && settings.announcementBar.text.trim() && (
        <div className="accent-bg text-sm">
          <div className="mx-auto max-w-6xl px-4 md:px-6 py-2">{settings.announcementBar.text}</div>
        </div>
      )}
      {visible.map((id) => (
        <div key={id}>{blocks[id]!()}</div>
      ))}
      <CallToAction />
    </>
  );
}

function openFirst(opportunities: CollectiveOpportunity[]): CollectiveOpportunity[] {
  const rank = { open: 0, closing_soon: 1, fulfilled: 2, closed: 3, cancelled: 4 };
  return [...opportunities].sort((a, b) => rank[a.status] - rank[b.status]);
}

function HeroSection({ settings }: { settings: SiteSettings }) {
  const t = getT();
  return (
    <section className="bg-gradient-to-b from-clay-50 to-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-20">
        <h1 className="text-3xl md:text-5xl font-black text-ink-900 max-w-3xl leading-tight">{settings.heroTitle}</h1>
        <p className="mt-3 md:mt-5 text-lg text-ink-700 max-w-2xl">{settings.heroDescription}</p>
        <p className="mt-2 text-sm text-ink-500 max-w-2xl">{settings.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/products" variant="secondary">{t('home.browseProducts')}</LinkButton>
          <LinkButton href="/tourism" variant="secondary">{t('home.browseTourism')}</LinkButton>
          <LinkButton href="/collective-orders" variant="secondary">{t('nav.collective')}</LinkButton>
        </div>
      </div>
    </section>
  );
}

function SearchSection() {
  const t = getT();
  return (
    <Section className="py-6 md:py-8">
      <form action="/explore" method="get" className="flex flex-col sm:flex-row gap-2 max-w-xl">
        <label className="sr-only" htmlFor="hero-search">
          {t('home.searchLabel')}
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder={t('home.searchPlaceholder')}
          className="flex-1 rounded-lg border border-ink-100 bg-white px-4 py-3 min-h-11 text-base"
        />
        <Button type="submit">{t('common.search')}</Button>
      </form>
      <p className="mt-2 text-xs text-ink-500 max-w-xl">
        {t('home.searchNote')}
      </p>
    </Section>
  );
}

function CategorySection({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  const t = getT();
  const lang = getLanguage();
  return (
    <Section eyebrow={t('home.categoriesEyebrow')} title={t('home.categoriesTitle')} description={t('home.categoriesDescription')}>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/explore?category=${encodeURIComponent(c.id)}`}
            className="rounded-xl border border-ink-100 bg-white p-4 hover:border-clay-300 hover:bg-clay-50"
          >
            <div className="font-semibold text-ink-900">
              {c.icon ? <span className="mr-2" aria-hidden="true">{c.icon}</span> : null}
              {categoryTexts(lang, c).name.text}
            </div>
            {(() => { const d = categoryTexts(lang, c).description; return d.text ? <p className="mt-1 text-sm text-ink-700 line-clamp-2">{d.text}</p> : null; })()}
          </Link>
        ))}
      </div>
    </Section>
  );
}

function FeaturedBlock({ titleKey, eyebrowKey, listings, producerById, viewAllHref }: {
  titleKey: TranslationKey;
  eyebrowKey: TranslationKey;
  listings: Listing[];
  producerById: Map<string, Profile>;
  viewAllHref: string;
}) {
  const t = getT();
  return (
    <Section eyebrow={t(eyebrowKey)} title={t(titleKey)}
      actions={
        <Link href={viewAllHref} className="text-clay-700 font-semibold underline">
          {t('common.viewAll')}
        </Link>
      }
    >
      {listings.length === 0 ? (
        <p className="text-sm text-ink-500">{t('home.featuredEmpty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} producer={producerById.get(l.producerId)} />
          ))}
        </div>
      )}
    </Section>
  );
}

function ProducersSection({ producers }: { producers: Profile[] }) {
  const t = getT();
  return (
    <Section eyebrow={t('home.producersEyebrow')} title={t('home.producersTitle')} description={t('home.producersDescription')}
    >
      {producers.length === 0 ? (
        <p className="text-sm text-ink-500">{t('home.producersEmpty')}</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {producers.map((p) => (
            <ProducerCard key={p.id} producer={p} />
          ))}
        </div>
      )}
    </Section>
  );
}

function CollectivePreview({ opportunities }: { opportunities: CollectiveOpportunity[] }) {
  const t = getT();
  return (
    <Section eyebrow={t('home.collectiveEyebrow')} title={t('home.collectiveTitle')} description={t('home.collectiveDescription')}
      actions={
        <Link href="/collective-orders" className="text-clay-700 font-semibold underline">
          {t('common.viewAll')}
        </Link>
      }
    >
      {opportunities.length === 0 ? (
        <p className="text-sm text-ink-500">{t('home.collectiveEmpty')}</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {opportunities.map((o) => (
            <CollectiveOpportunityCard key={o.id} opportunity={o} />
          ))}
        </div>
      )}
    </Section>
  );
}

function HowItWorksTeaser() {
  const t = getT();
  return (
    <Section id="how" eyebrow={t('home.howEyebrow')} title={t('home.howTitle')}>
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.howStep1Title')}</h3>
            <p className="mt-1 text-sm text-ink-700">
              {t('home.howStep1Body')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.howStep2Title')}</h3>
            <p className="mt-1 text-sm text-ink-700">
              {t('home.howStep2Body')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.howStep3Title')}</h3>
            <p className="mt-1 text-sm text-ink-700">
              {t('home.howStep3Body')}
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function TeamPreview() {
  const t = getT();
  return (
    <Section
      id="team"
      eyebrow={t('home.teamEyebrow')}
      title={t('home.teamTitle')}
      description={t('home.teamBody')}
      actions={<LinkButton href="/team" variant="secondary">{t('home.teamLink')}</LinkButton>}
    >
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TEAM_MEMBERS.map((member) => (
          <TeamMemberCard key={member.id} member={member} compact />
        ))}
      </div>
    </Section>
  );
}

function CollectiveExplainer() {
  const t = getT();
  return (
    <Section
      id="collective"
      eyebrow={t('home.collectiveEyebrow')} title={t('home.poolingTitle')} description={t('home.poolingDescription')}
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.poolingProducers')}</h3>
            <ul className="mt-2 text-sm text-ink-700 list-disc pl-5 space-y-1">
              <li>{t('home.poolingProducers1')}</li>
              <li>{t('home.poolingProducers2')}</li>
              <li>{t('home.poolingProducers3')}</li>
              <li>{t('home.poolingProducers4')}</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.poolingBuyers')}</h3>
            <ul className="mt-2 text-sm text-ink-700 list-disc pl-5 space-y-1">
              <li>{t('home.poolingBuyers1')}</li>
              <li>{t('home.poolingBuyers2')}</li>
              <li>{t('home.poolingBuyers3')}</li>
              <li>{t('home.poolingBuyers4')}</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function TrustSection() {
  const t = getT();
  return (
    <Section id="trust" eyebrow={t('home.trustEyebrow')} title={t('home.trustTitle')}>
      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.trustVerification')}</h3>
            <p className="mt-1 text-ink-700">
              {t('home.trustVerificationBody')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.trustConsent')}</h3>
            <p className="mt-1 text-ink-700">
              {t('home.trustConsentBody')}
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">{t('home.trustSample')}</h3>
            <p className="mt-1 text-ink-700">
              {t('home.trustSampleBody')}
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function CallToAction() {
  const t = getT();
  return (
    <Section>
      <div className="rounded-2xl accent-bg p-6 md:p-10 grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">{t('home.ctaProducerTitle')}</h2>
          <p className="mt-2 opacity-90">
            {t('home.ctaProducerBody')}
          </p>
          <Link href="/register" className="mt-4 inline-flex items-center bg-white text-ink-900 font-bold px-5 py-3 rounded-lg">
            {t('home.ctaProducerAction')}
          </Link>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">{t('home.ctaBulkTitle')}</h2>
          <p className="mt-2 opacity-90">
            {t('home.ctaBulkBody')}
          </p>
          <Link
            href="/collective-orders"
            className="mt-4 inline-flex items-center bg-white text-ink-900 font-bold px-5 py-3 rounded-lg"
          >
            {t('home.ctaBulkAction')}
          </Link>
        </div>
      </div>
    </Section>
  );
}
