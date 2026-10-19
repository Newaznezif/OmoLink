import Link from 'next/link';
import { getRepo } from '@/lib/repo';
import { isDemoMode } from '@/lib/store';
import { requireArea } from '@/lib/area';
import { AccountSettingsForm } from '@/components/account-settings-form';
import { AppearanceCard } from '@/components/appearance-card';
import { Badge, Card, CardBody, Empty, Section } from '@/components/ui';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Account settings',
  description: 'Change your details, choose how sellers contact you, and see what OmoNetTab holds about you.'
};

export default async function BuyerSettingsPage() {
  const actor = await requireArea('/buyer', ['buyer']);
  const profile = await getRepo().getProfile(actor.profileId);

  if (!profile) {
    return (
      <Section eyebrow="My account" title="Account settings">
        <Empty
          title="No profile for this account"
          body="The signed-in account has no profile record to edit. Register again, or ask an administrator to look at the account."
          action={
            <Link href="/register" className="underline font-semibold text-clay-700">
              Go to registration
            </Link>
          }
        />
      </Section>
    );
  }

  return (
    <Section
      eyebrow="My account"
      title="Settings"
      description="Your details, your contact choice, and an honest list of what this platform stores about you."
    >
      <AccountSettingsForm profile={profile} variant="buyer" />

      <AppearanceCard profile={profile} />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">What OmoNetTab stores about you</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>Your profile record: name, community, area, language, the colour scheme you chose, the contact method above, and consent flags.</li>
            <li>Each inquiry you send, with its status history — visible to you, the seller on that listing, and an administrator.</li>
            <li>Any review you post, under the name you display.</li>
            <li>
              Your role is <strong>{profile.role}</strong>. It is set by an administrator in the account record; nothing
              on this page can change it, and the server overwrites it if a request tries.
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            {isDemoMode()
              ? 'Demo mode: this session is a plain cookie holding a sample user id, and every record above is sample data that disappears when the server restarts.'
              : 'Authentication runs through Supabase with Row Level Security, so these records are readable only to the accounts allowed to see them.'}
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Corrections, deletion and complaints</h2>
          <p className="mt-2 text-sm text-ink-700">
            There is no self-service delete button, because removing an inquiry record also removes a seller’s evidence
            of an arrangement. Ask for a correction or a deletion through the{' '}
            <Link href="/contact" className="underline font-semibold text-clay-700">
              contact page
            </Link>
            , and an administrator acts on it and records the decision in the audit log. The{' '}
            <Link href="/privacy" className="underline font-semibold text-clay-700">
              privacy notice
            </Link>{' '}
            states what is held and for how long.
          </p>
          <div className="mt-2 flex flex-wrap gap-2 items-center text-sm">
            <Badge tone="neutral">Sign out using the button in the header</Badge>
            <Link href="/offline" className="underline font-semibold text-clay-700">
              Drafts saved on this device
            </Link>
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}
