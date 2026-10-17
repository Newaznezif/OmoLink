import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { Badge, Card, CardBody, Section } from '@/components/ui';
import { OpportunityForm } from '@/components/opportunity-form';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Open a group order',
  description: 'Set the target, the pickup plan and the deadline a group can contribute towards.'
};

export default async function NewOpportunityPage() {
  const actor = await requireArea('/dashboard', ['producer', 'coordinator']);
  const repo = getRepo();
  const [profile, categories, groups] = await Promise.all([
    repo.getProfile(actor.profileId),
    repo.listCategories(),
    repo.listGroups()
  ]);
  const myGroups = groups.filter(
    (g) => g.coordinatorProfileId === actor.profileId || (profile?.groupIds ?? []).includes(g.id)
  );
  const canCoordinate = actor.role === 'coordinator' && myGroups.length > 0;

  if (!canCoordinate) {
    return (
      <Section
        eyebrow="Dashboard"
        title="Opening a group order is a coordinator power"
        description="Any selling account can contribute to a group order. Creating one — and confirming what other members committed — belongs to an account an administrator has marked as a group coordinator."
      >
        <Card>
          <CardBody>
            {actor.role !== 'coordinator' ? (
              <p className="text-sm text-ink-700">
                Your account type is <strong>{actor.role}</strong>. Ask an administrator to assign coordinator rights for
                your group; the assignment is recorded in the account and in the audit log, and it cannot be granted from
                this page.
              </p>
            ) : (
              <p className="text-sm text-ink-700">
                You are a coordinator, but no group record lists you as one of its members or coordinators yet, so there is
                nothing to organise an order under. An administrator can add your account to the group.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2 text-sm">
              <Link href="/dashboard/collective-orders" className="underline font-semibold text-clay-700">
                My contributions
              </Link>
              <Link href="/collective-orders" className="underline font-semibold text-clay-700">
                Browse open group orders
              </Link>
              <Link href="/contact" className="underline font-semibold text-clay-700">
                Contact an administrator
              </Link>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">Role: {actor.role}</Badge>
              <Badge tone="neutral">Groups you belong to: {myGroups.length}</Badge>
            </div>
          </CardBody>
        </Card>
      </Section>
    );
  }

  return (
    <Section
      eyebrow="Dashboard"
      title="Open a group order"
      description="A group order is a shared request for quantity, not a payment. Write the plan the way you would explain it at the meeting: what is wanted, where it is picked up, and by when."
    >
      <OpportunityForm categories={categories} groups={myGroups} />
    </Section>
  );
}
