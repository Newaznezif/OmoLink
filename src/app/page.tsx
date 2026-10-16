import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import type { CollectiveOpportunity, Listing, Profile } from '@/lib/types';
import { ListingCard } from '@/components/listing-card';
import { ProducerCard } from '@/components/producer-card';
import { Button, Card, CardBody, LinkButton, SampleTag, Section } from '@/components/ui';
import { CollectiveOpportunityCard } from '@/components/collective-card';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const repo = getRepo();
  const [listings, profiles, opportunities] = await Promise.all([
    repo.listPublicListings(),
    repo.listPublicProfiles(),
    repo.listOpportunities()
  ]);

  const featuredProducts: Listing[] = listings.filter((l) => l.kind === 'product').slice(0, 3);
  const featuredTourism: Listing[] = listings.filter((l) => l.kind === 'service').slice(0, 2);
  const featuredProducers: Profile[] = profiles.filter((p) => p.id !== 'prof_admin').slice(0, 3);
  const producerById = new Map<string, Profile>(profiles.map((p) => [p.id, p]));

  return (
    <>
      <HeroSection />
      <FeaturedBlock
        title="Featured local products"
        eyebrow="Sample producers"
        listings={featuredProducts}
        producerById={producerById}
        viewAllHref="/products"
      />
      <FeaturedBlock
        title="Tourism services"
        eyebrow="Guided experiences"
        listings={featuredTourism}
        producerById={producerById}
        viewAllHref="/tourism"
      />
      <ProducersSection producers={featuredProducers} />
      <CollectivePreview opportunities={opportunities.slice(0, 2)} />
      <HowItWorksTeaser />
      <CollectiveExplainer />
      <TrustSection />
      <CallToAction />
    </>
  );
}

function HeroSection() {
  return (
    <section className="bg-gradient-to-b from-clay-50 to-white">
      <div className="mx-auto max-w-6xl px-4 md:px-6 py-12 md:py-20">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <SampleTag />
          <span className="text-xs text-ink-500">Prototype — sample data only.</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-black text-ink-900 max-w-3xl leading-tight">
          Connecting South Omo’s local producers to wider markets.
        </h1>
        <p className="mt-3 md:mt-5 text-lg text-ink-700 max-w-2xl">
          A marketplace where artisans, farmers, producer groups, guides and community operators can present products
          and services, publish clear prices, and coordinate collective orders — with a low-bandwidth design.
        </p>
        <form action="/explore" method="get" className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl">
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
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/products" variant="secondary">Browse products</LinkButton>
          <LinkButton href="/tourism" variant="secondary">Browse tourism services</LinkButton>
          <LinkButton href="/collective-orders" variant="secondary">Collective orders</LinkButton>
        </div>
      </div>
    </section>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {listings.map((l) => (
          <ListingCard key={l.id} listing={l} producer={producerById.get(l.producerId)} />
        ))}
      </div>
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
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {producers.map((p) => (
          <ProducerCard key={p.id} producer={p} />
        ))}
      </div>
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
      <div className="grid md:grid-cols-2 gap-4">
        {opportunities.map((o) => (
          <CollectiveOpportunityCard key={o.id} opportunity={o} />
        ))}
      </div>
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
              Producer and buyer agree payment, pickup and delivery in the real world. The dashboard tracks the
              inquiry state honestly.
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
              Verification has three states: unverified, pending review, and verified. Only an authorised reviewer can
              approve a profile. The verification workflow itself is still being designed for the pilot — this prototype
              does not claim any producer is verified in the real world.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-ink-900">Consent-aware publication</h3>
            <p className="mt-1 text-ink-700">
              Cultural performances, ceremonies and community images are only published with recorded consent.
              Sensitive cultural knowledge is never commercialised by default.
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
      <div className="rounded-2xl bg-clay-700 text-white p-6 md:p-10 grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Are you a producer?</h2>
          <p className="mt-2 text-white/90">
            Registration and basic listing remain free during the pilot. You keep full control of your prices.
          </p>
          <Link href="/register" className="mt-4 inline-flex items-center bg-white text-clay-800 font-bold px-5 py-3 rounded-lg">
            Register as a producer →
          </Link>
        </div>
        <div>
          <h2 className="text-2xl md:text-3xl font-black">Buying in bulk?</h2>
          <p className="mt-2 text-white/90">
            Browse collective orders and see how producer groups pool supply for hotels, retailers, schools and other
            institutions.
          </p>
          <Link
            href="/collective-orders"
            className="mt-4 inline-flex items-center bg-white text-clay-800 font-bold px-5 py-3 rounded-lg"
          >
            Explore collective orders →
          </Link>
        </div>
      </div>
    </Section>
  );
}
