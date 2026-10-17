import { Card, CardBody, Section } from '@/components/ui';

export default function CommunityGuidelinesPage() {
  return (
    <Section eyebrow="Community" title="Community guidelines" description="How producers, buyers and coordinators treat one another on OmoNETAB. Drafted for pilot validation with community partners.">
      <div className="grid md:grid-cols-2 gap-4 text-sm">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Publishing rules</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>Every listing must state a unit price in ETB and a unit of sale. Hidden fees are not allowed.</li>
              <li>Images must be genuinely of the item or service being offered, and clearly labelled as placeholder if not.</li>
              <li>Ceremonies, sacred sites, and cultural practices are not commercialised without recorded community consent.</li>
              <li>Producer location is published at community level only when the producer consents.</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Behaviour</h2>
            <ul className="mt-2 list-disc pl-5 space-y-1 text-ink-700">
              <li>Respond to inquiries honestly. Never mark an inquiry “completed” if the goods or service have not been exchanged.</li>
              <li>Never claim that a payment has been received unless it has.</li>
              <li>Respect coordinators running collective orders. Contributions are commitments to a group.</li>
              <li>Report misleading listings or inappropriate cultural content through the “Report” action on any listing.</li>
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Disputes</h2>
            <p className="mt-2 text-ink-700">
              Most disagreements are resolved through direct conversation. When they are not, an authorised reviewer
              mediates using the recorded inquiry timeline, contributions log and consent records. In this demo build,
              administrative actions are simulated. The pilot will define the real dispute path with community partners.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Impact measurement</h2>
            <p className="mt-2 text-ink-700">
              A future pilot should measure net producer benefit <em>after</em> transport, packaging, coordination and
              platform costs. Numbers shown in the admin dashboard are demo data, not measured impact. We never publish
              fabricated statistics, testimonials or endorsement claims.
            </p>
          </CardBody>
        </Card>
      </div>
    </Section>
  );
}
