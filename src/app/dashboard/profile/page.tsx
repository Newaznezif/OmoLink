import { getRepo } from '@/lib/repo';
import { getSessionProfile } from '@/lib/session';
import { Badge, Card, CardBody, Field, Input, Section, Textarea, VerificationLabel } from '@/components/ui';
import { SaveProfileButton } from '@/components/save-profile-button';

export const dynamic = 'force-dynamic';

export default async function DashboardProfilePage() {
  const profile = await getSessionProfile();
  if (!profile) return null;
  const categories = await getRepo().listCategories();
  return (
    <Section eyebrow="Dashboard" title="My profile" description="Keep your public profile accurate. Only information you consent to publish appears here. Private contacts stay private.">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-4">
            <VerificationLabel status={profile.verification} isDemo={profile.isDemo} />
            <Badge tone="neutral">Created {new Date(profile.createdAt).toLocaleDateString()}</Badge>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Display name" htmlFor="displayName">
              <Input id="displayName" name="displayName" defaultValue={profile.displayName} />
            </Field>
            <Field label="Community" htmlFor="community">
              <Input id="community" name="community" defaultValue={profile.community} />
            </Field>
            <Field label="Operating area" htmlFor="operatingArea">
              <Input id="operatingArea" name="operatingArea" defaultValue={profile.operatingArea} />
            </Field>
            <Field label="Preferred language" htmlFor="preferredLanguage">
              <Input id="preferredLanguage" name="preferredLanguage" defaultValue={profile.preferredLanguage} readOnly />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Short bio" htmlFor="shortBio">
              <Textarea id="shortBio" name="shortBio" defaultValue={profile.shortBio} />
            </Field>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-ink-900 mb-1">Categories</h3>
            <div className="flex flex-wrap gap-2">
              {categories
                .filter((c) => profile.categories.includes(c.id))
                .map((c) => (
                  <Badge key={c.id} tone="info">
                    {c.name}
                  </Badge>
                ))}
              {profile.categories.length === 0 && <span className="text-sm text-ink-500">None selected.</span>}
            </div>
          </div>
          <div className="mt-4">
            <h3 className="font-semibold text-ink-900 mb-1">Contact</h3>
            <p className="text-sm text-ink-700">
              {profile.contactMethod.kind === 'in_app'
                ? 'In-app inquiries only. Private contact details are not published.'
                : profile.contactMethod.kind === 'phone' && 'consent' in profile.contactMethod && profile.contactMethod.consent
                  ? `Phone: ${profile.contactMethod.value}`
                  : profile.contactMethod.kind === 'email' && 'consent' in profile.contactMethod && profile.contactMethod.consent
                    ? `Email: ${profile.contactMethod.value}`
                    : 'Not published.'}
            </p>
          </div>
          <div className="mt-4">
            <SaveProfileButton />
          </div>
          <p className="mt-3 text-xs text-ink-500">
            In this demo build, profile edits update the in-memory store only. They reset on server cold restart.
          </p>
        </CardBody>
      </Card>
    </Section>
  );
}
