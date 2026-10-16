import { Card, CardBody, Section, Badge } from '@/components/ui';

export default function HowItWorksPage() {
  return (
    <Section
      eyebrow="How it works"
      title="A practical journey from producer to buyer"
      description="OmoLink focuses on a working end-to-end journey: publish clearly, receive an inquiry, coordinate the exchange honestly. Payments and delivery happen outside the platform during the pilot."
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Step n={1} title="Producer registers">
          A producer, guide, group or cooperative creates a profile with display name, community, categories, and a
          consent flag. No identity documents are collected for a basic account.
        </Step>
        <Step n={2} title="Producer publishes">
          Each listing includes unit price, unit of sale, available quantity, minimum order, availability, pickup
          options, and consent-respecting imagery. Prices never hide a mandatory fee.
        </Step>
        <Step n={3} title="Buyer discovers">
          Buyers browse or search across products, tourism services and collective orders, filter by community,
          category, price, or availability, and open a listing.
        </Step>
        <Step n={4} title="Buyer inquires">
          A buyer enters a quantity, sees an estimated subtotal, provides a contact channel, and submits the inquiry.
          The system responds with a reference number and never marks the record as a completed sale.
        </Step>
        <Step n={5} title="Producer responds">
          The inquiry appears in the seller dashboard. The producer updates status honestly: new → accepted →
          awaiting confirmation → fulfillment arranged → completed or cancelled.
        </Step>
        <Step n={6} title="Collective orders">
          Producers pool available quantities against a group opportunity. The platform aggregates totals, validates
          contributions against stock, and offers a shared transport cost calculator. Actual savings are never
          fabricated.
        </Step>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-bold mb-3">Trust and transparency</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold">Verification statuses are explicit</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge tone="neutral">Unverified</Badge>
                <Badge tone="warning">Pending review</Badge>
                <Badge tone="success">Verified</Badge>
              </div>
              <p className="mt-2 text-sm text-ink-700">
                Only an authorised reviewer can move a profile to verified. The verification procedure itself is still
                being designed for the pilot.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold">Consent-aware cultural content</h3>
              <p className="mt-2 text-sm text-ink-700">
                Cultural performances, ceremonies, and community images are only published with recorded consent. The
                platform never commercialises sensitive cultural knowledge by default.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <h3 className="font-semibold">Sample data is labelled</h3>
              <p className="mt-2 text-sm text-ink-700">
                Every sample producer, listing, and opportunity carries a visible “Sample data” tag. We never present
                placeholders as documentary evidence of a real producer.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </Section>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-clay-700 text-white font-black grid place-items-center">{n}</span>
          <h3 className="font-semibold text-ink-900">{title}</h3>
        </div>
        <p className="mt-2 text-sm text-ink-700">{children}</p>
      </CardBody>
    </Card>
  );
}
