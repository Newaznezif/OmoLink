import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import type { Category, CollectiveOpportunity, HomepageSectionId, Listing, Profile, SiteSettings } from '@/lib/types';
import { ListingCard } from '@/components/listing-card';
import { ProducerCard } from '@/components/producer-card';
import { Button, Card, CardBody, LinkButton, SampleTag, Section } from '@/components/ui';
import { CollectiveOpportunityCard } from '@/components/collective-card';

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
        title="Featured local products"
        eyebrow="Highlighted by the team"
        listings={featuredProducts}
        producerById={producerById}
        viewAllHref="/products"
      />
    ),
    featured_tourism: () => (
      <FeaturedBlock
        title="Tourism services"
        eyebrow="Guided experiences"
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
  return (
    <section className="bg-gradient-to-b from-clay-50 to-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SampleTag />
          <span className="text-xs text-ink-500">Prototype — sample data only.</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-ink-900 max-w-3xl leading-tight">{settings.heroTitle}</h1>
        <p className="mt-3 md:mt-5 text-lg text-ink-700 max-w-2xl">{settings.heroDescription}</p>
        <p className="mt-2 text-sm text-ink-500 max-w-2xl">{settings.tagline}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/products" variant="secondary">Browse products</LinkButton>
          <LinkButton href="/tourism" variant="secondary">Browse tourism services</LinkButton>
          <LinkButton href="/collective-orders" variant="secondary">Collective orders</LinkButton>
        </div>
      </div>
    </section>
  );
}

function SearchSection() {
  return (
    <Section className="py-6 md:py-8">
      <form action="/explore" method="get" className="flex flex-col sm:flex-row gap-2 max-w-xl">
        <label className="sr-only" htmlFor="hero-search">
          Search listings
        </label>
        <input
          id="hero-search"
          name="q"
          type="search"
          placeholder="Search products, services, producers…"
          className="flex-1 rounded-lg border border-ink-100 bg-white px-4 py-3 min-h-11 text-base"
        />
        <Button type="submit">Search</Button>
      </form>
      <p className="mt-2 text-xs text-ink-500 max-w-xl">
        Search and the filters on the results page act on real records in this build — an empty result says so instead
        of showing sample rows.
      </p>
    </Section>
  );
}

function CategorySection({ categories }: { categories: Category[] }) {
  if (categories.length === 0) return null;
  return (
    <Section eyebrow="Browse by" title="Categories" description="Every category here has a working results page.">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((c) => (
          <Link
            key={c.id}
            href={`/explore?category=${encodeURIComponent(c.id)}`}
            className="rounded-xl border border-ink-100 bg-white p-4 hover:border-clay-300 hover:bg-clay-50"
          >
            <div className="font-semibold text-ink-900">
              {c.icon ? <span className="mr-2" aria-hidden="true">{c.icon}</span> : null}
              {c.name}
            </div>
            {c.description && <p className="mt-1 text-sm text-ink-700 line-clamp-2">{c.description}</p>}
          </Link>
        ))}
      </div>
    </Section>
  );
}

function FeaturedBlock({
  title,
  eyebrow,
  listings,
  producerById,
  viewAllHref
}: {
  title: string;
  eyebrow: string;
  listings: Listing[];
  producerById: Map<string, Profile>;
  viewAllHref: string;
}) {
  return (
    <Section
      eyebrow={eyebrow}
      title={title}
      actions={
        <Link href={viewAllHref} className="text-clay-700 font-semibold underline">
          View all →
        </Link>
      }
    >
      {listings.length === 0 ? (
        <p className="text-sm text-ink-500">
          Nothing has been published in this group yet. An administrator can highlight listings from the admin homepage
          settings.
        </p>
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
  return (
    <Section
      eyebrow="Community"
      title="Producer highlights"
      description="Sample profiles. Do not present these as real, verified producers."
    >
      {producers.length === 0 ? (
        <p className="text-sm text-ink-500">No selling profile has been published yet.</p>
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
  return (
    <Section
      eyebrow="Collective selling"
      title="Open group orders"
      description="Sample opportunities showing how producers pool quantities to serve bulk buyers."
      actions={
        <Link href="/collective-orders" className="text-clay-700 font-semibold underline">
          View all →
        </Link>
      }
    >
      {opportunities.length === 0 ? (
        <p className="text-sm text-ink-500">No group order is open right now.</p>
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
  return (
    <Section id="how" eyebrow="Direct selling" title="How OmoLink helps a producer sell directly">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">1. Publish clearly</h3>
            <p className="mt-1 text-sm text-ink-700">
              Producers list items and services with explicit unit price, unit of sale, availability, minimum order and
              pickup options. No hidden fees.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">2. Buyers send inquiries</h3>
            <p className="mt-1 text-sm text-ink-700">
              A buyer enters quantity, sees the estimated subtotal, then sends an inquiry that produces a reference
              number. Nothing is auto-marked as sold.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">3. Coordinate off-platform</h3>
            <p className="mt-1 text-sm text-ink-700">
              Producer and buyer agree payment, pickup and delivery in the real world. The dashboard tracks the inquiry
              state honestly.
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function CollectiveExplainer() {
  return (
    <Section
      id="collective"
      eyebrow="Collective selling"
      title="Pooling supply for bulk buyers"
      description="A differentiator of OmoLink: producers join a group opportunity, contribute available quantity, and coordinate shared transport."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">What producers see</h3>
            <ul className="mt-2 text-sm text-ink-700 list-disc pl-5 space-y-1">
              <li>Aggregate quantity vs. target</li>
              <li>Number of participating producers</li>
              <li>Indicative group price (not imposed)</li>
              <li>Estimated transport cost per unit and per producer</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">What buyers see</h3>
            <ul className="mt-2 text-sm text-ink-700 list-disc pl-5 space-y-1">
              <li>Total available and remaining</li>
              <li>Pickup / transport plan</li>
              <li>Order deadline</li>
              <li>Coordinator contact channel</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function TrustSection() {
  return (
    <Section id="trust" eyebrow="Trust" title="Honest status, clear consent">
      <div className="grid md:grid-cols-3 gap-4 text-sm">
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">Explicit verification</h3>
            <p className="mt-1 text-ink-700">
              Verification has three states: unverified, pending review, and verified. Only an administrator can approve
              a profile, and no one approves their own request. The verification workflow is still being designed for
              the pilot — this prototype does not claim any producer is verified in the real world.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">Consent-aware publication</h3>
            <p className="mt-1 text-ink-700">
              Cultural performances, ceremonies and community images are only published with recorded consent. A contact
              detail without stored consent is never published. Sensitive cultural knowledge is never commercialised by
              default.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">Sample vs. real data</h3>
            <p className="mt-1 text-ink-700">
              Every demo record carries a visible “Sample data” label. We do not present generic placeholders as
              documentary evidence of a specific producer or community.
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}

function CallToAction() {
  return (
    <Section>
      <div className="rounded-2xl accent-bg p-6 md:p-10 grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Are you a producer?</h2>
          <p className="mt-2 opacity-90">
            Registration and basic listing remain free during the pilot. You keep full control of your prices.
          </p>
          <Link href="/register" className="mt-4 inline-flex items-center bg-white text-ink-900 font-bold px-5 py-3 rounded-lg">
            Create an account →
          </Link>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Buying in bulk?</h2>
          <p className="mt-2 opacity-90">
            Browse collective orders and see how producer groups pool supply for hotels, retailers, schools and other
            institutions.
          </p>
          <Link
            href="/collective-orders"
            className="mt-4 inline-flex items-center bg-white text-ink-900 font-bold px-5 py-3 rounded-lg"
          >
            Explore collective orders →
          </Link>
        </div>
      </div>
    </Section>
  );
}
