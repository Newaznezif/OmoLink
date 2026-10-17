import { Section, Card, CardBody, LinkButton } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default function AccessDeniedPage() {
  return (
    <Section
      eyebrow="Not available"
      title="Your account cannot open this area"
      description="You are signed in, but this part of OmoNETAB is limited to a different account type. Nothing was changed and nothing was exposed. If you believe you should have access, ask an administrator to review your account role."
    >
      <Card>
        <CardBody className="space-y-3">
          <p className="text-sm text-ink-700">
            Producers open the selling dashboard, buyers and visitors open the buyer area, and only administrators
            reach the moderation tools. Roles are stored on your profile and set by an administrator — they are not
            something a page or a cookie can change.
          </p>
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/dashboard">Go to my dashboard</LinkButton>
            <LinkButton href="/buyer" variant="secondary">
              Buyer area
            </LinkButton>
            <LinkButton href="/" variant="ghost">
              Back to the marketplace
            </LinkButton>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}
