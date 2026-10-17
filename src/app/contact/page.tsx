import { getRepo } from '@/lib/repo';
import { Section, Card, CardBody, Badge } from '@/components/ui';
import { ContactForm } from '@/components/contact-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Contact',
  description: 'Send a message to the OmoNETAB team about a product, a service, or a concern.'
};

export default async function ContactPage() {
  const settings = await getRepo().getSiteSettings();

  return (
    <Section
      eyebrow="Contact"
      title="Talk to the OmoNETAB team"
      description="Use this form for anything the marketplace itself: a listing that looks wrong, help contacting a producer, a group that wants to organise a collective order, or feedback from a pilot area. Messages reach an administrator, not the producer — a producer answers you through the inquiry on their listing."
    >
      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Card className="lg:col-span-2">
          <CardBody>
            <ContactForm />
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardBody className="space-y-2 text-sm">
              <h2 className="font-semibold text-ink-900">Other ways to reach us</h2>
              {settings.contactEmail ? (
                <p>
                  Email: <a href={`mailto:${settings.contactEmail}`} className="underline font-semibold">{settings.contactEmail}</a>
                </p>
              ) : (
                <p className="text-ink-500">
                  No direct email address has been published for this instance yet. An administrator can add one in the
                  admin settings.
                </p>
              )}
              {settings.contactPhone ? (
                <p>Phone: {settings.contactPhone}</p>
              ) : (
                <p className="text-ink-500">No phone line has been published for this instance yet.</p>
              )}
              {settings.addressNote && <p className="text-ink-700">{settings.addressNote}</p>}
              <p className="text-xs text-ink-500">
                These details are maintained by an administrator in the admin area, so they are only shown once they
                have actually been provided.
              </p>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="space-y-2 text-sm">
              <h2 className="font-semibold text-ink-900">Before you write</h2>
              <ul className="list-disc pl-5 space-y-1 text-ink-700">
                <li>To ask about a specific product or experience, use “Send inquiry” on that listing — the producer sees it directly.</li>
                <li>To report a listing, use the “Report listing” link on the listing page.</li>
                <li>This form records an enquiry. It is not an order, a booking, or a payment.</li>
              </ul>
              <Badge tone="info">No SMS or phone integration is connected</Badge>
              <p className="text-xs text-ink-500">
                OmoNETAB does not send or receive SMS, USSD, or payment messages in this build. Where such a service is
                added later, the provider must be configured and tested before it is described as working.
              </p>
            </CardBody>
          </Card>
        </div>
      </div>
    </Section>
  );
}
