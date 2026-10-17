import Link from 'next/link';
import { Section, LinkButton, Card, CardBody } from '@/components/ui';

export default function NotFound() {
  return (
    <Section
      eyebrow="404"
      title="That page does not exist"
      description="The address may be mistyped, an old link, or a listing that has been archived by its producer. Nothing was deleted from your side."
    >
      <Card>
        <CardBody className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <LinkButton href="/">Back to the marketplace</LinkButton>
            <LinkButton href="/products" variant="secondary">
              Browse products
            </LinkButton>
            <LinkButton href="/tourism" variant="secondary">
              Browse tourism services
            </LinkButton>
          </div>
          <p className="text-sm text-ink-700">
            Looking for a specific producer or listing? Use <Link href="/explore" className="underline font-semibold">search and filters</Link>,
            or send a note through <Link href="/contact" className="underline font-semibold">contact</Link> and we will help you find it.
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
