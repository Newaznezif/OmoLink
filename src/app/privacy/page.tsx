import { Card, CardBody, Section } from '@/components/ui';

export default function PrivacyPage() {
  return (
    <Section eyebrow="Privacy" title="Data minimisation and consent" description="OmoNETAB is designed to collect information needed to run a marketplace. This page is a placeholder that will be finalised with community input and legal review before a live pilot.">
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">What we store</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>Producer display name, community, operating area and short bio — only after recorded consent.</li>
              <li>Listing title, description, price, unit, quantity, availability and pickup options.</li>
              <li>Buyer inquiry fields: name, contact channel, quantity, message, preference and optional date.</li>
              <li>Group opportunity records and per-producer contributions.</li>
              <li>Verification decisions and report submissions for administrative review.</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">What we do not store</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>Identity documents for a basic demo account.</li>
              <li>Payment card or wallet credentials — no payment processing is wired up.</li>
              <li>Precise geo-coordinates or household locations.</li>
              <li>Ceremony details, sacred knowledge or unconsented community images.</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}
