import { getRepo } from '@/lib/repo';
import { getSessionActor } from '@/lib/session';
import { AdminSection, BackField } from '@/components/admin-shell';
import { AppearanceCard } from '@/components/appearance-card';
import { Button, Card, CardBody, Field, Input, Textarea } from '@/components/ui';
import { accentContrastColor } from '@/lib/settings';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

/** Rows offered for social links beyond the stored ones; blank rows are dropped on save. */
const SPARE_LINK_ROWS = 3;

export default async function AdminSettingsPage({ searchParams }: { searchParams: SearchParams }) {
  const settings = await getRepo().getSiteSettings();
  // The appearance card below is the signed-in administrator's own scheme, not a
  // site-wide setting, so it reads their profile record — which is exactly why the
  // site-settings form above does not contain it.
  const actor = await getSessionActor();
  const adminProfile = actor ? await getRepo().getProfile(actor.profileId) : undefined;
  const links: { key: string; label: string; url: string }[] = [
    ...settings.socialLinks.map((link, index) => ({ key: `stored-${index}`, ...link })),
    ...Array.from({ length: SPARE_LINK_ROWS }, (_, index) => ({ key: `spare-${index}`, label: '', url: '' }))
  ];

  return (
    <AdminSection
      title="Site settings"
      description="Name, contact details, announcement bar and accent colour. Everything here is stored, so a text change does not need a redeploy. Values are checked on the server before they are written — a stored string appears on every page, so only plain text and a hex colour are accepted."
      searchParams={searchParams}
    >
      <form method="post" action="/api/admin/settings" className="space-y-4">
        <BackField path="/admin/settings" />

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">Identity</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label="Site name"
                htmlFor="siteName"
                required
                hint="Used in the browser tab, page titles and the footer copyright line. The header and footer show the logo image, which carries its own wording."
              >
                <Input id="siteName" name="siteName" defaultValue={settings.siteName} maxLength={60} required />
              </Field>
              <Field label="Tagline" htmlFor="tagline" hint="Follows the site name in the browser tab title. 160 characters or fewer.">
                <Input id="tagline" name="tagline" defaultValue={settings.tagline} maxLength={160} />
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">Announcement bar</h2>
            <label htmlFor="announcementEnabled" className="flex items-start gap-2 text-sm text-ink-700">
              <input
                id="announcementEnabled"
                name="announcementEnabled"
                type="checkbox"
                value="on"
                defaultChecked={settings.announcementBar.enabled}
                className="mt-1 h-4 w-4"
              />
              <span>Show the bar above the header</span>
            </label>
            <Field label="Announcement text" htmlFor="announcementText" hint="Required while the bar is on. 160 characters or fewer.">
              <Input
                id="announcementText"
                name="announcementText"
                defaultValue={settings.announcementBar.text}
                maxLength={160}
              />
            </Field>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">Accent colour</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Field
                label="Hex colour"
                htmlFor="accentColor"
                required
                hint="Applied to primary buttons, the announcement bar and the homepage call to action."
              >
                <Input id="accentColor" name="accentColor" type="color" defaultValue={settings.accentColor} className="h-11 p-1" />
              </Field>
              <div>
                <p className="block text-sm font-semibold text-ink-900 mb-1">Preview</p>
                <div className="flex flex-wrap gap-2 items-center">
                  <span className="accent-bg rounded-lg px-4 py-2 text-sm font-semibold">Primary button</span>
                  <span className="accent-bg rounded-lg px-4 py-2 text-sm">Announcement text</span>
                </div>
                <p className="mt-2 text-xs text-ink-500">
                  The text colour is chosen from this background’s brightness, so a pale accent switches to dark text
                  instead of turning white-on-white unreadable.
                </p>
              </div>
            </div>
            <p className="text-xs text-ink-500">
              Stored value: <code>{settings.accentColor}</code> → text{' '}
              <code>{accentContrastColor(settings.accentColor)}</code>. The Tailwind palette used for cards, borders and
              backgrounds is compiled at build time and is not changeable here — see the README.
            </p>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4">
            <h2 className="font-semibold text-ink-900">Public contact details</h2>
            <p className="text-sm text-ink-500">
              These appear on the contact page and in the footer. Leave a field empty to hide that channel — the contact
              form tells visitors what is actually monitored.
            </p>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="Contact email" htmlFor="contactEmail">
                <Input id="contactEmail" name="contactEmail" type="email" defaultValue={settings.contactEmail} maxLength={200} />
              </Field>
              <Field label="Contact phone" htmlFor="contactPhone">
                <Input id="contactPhone" name="contactPhone" defaultValue={settings.contactPhone} maxLength={40} />
              </Field>
            </div>
            <Field label="Location note" htmlFor="addressNote" hint="Free text; no map is claimed.">
              <Input id="addressNote" name="addressNote" defaultValue={settings.addressNote} maxLength={240} />
            </Field>
            <Field label="Footer note" htmlFor="footerNote">
              <Textarea id="footerNote" name="footerNote" defaultValue={settings.footerNote} maxLength={240} className="min-h-[80px]" />
            </Field>

            <h3 className="font-semibold text-ink-900 pt-2">Links</h3>
            <p className="text-xs text-ink-500">
              Fill a row to add or change a link; clear both boxes to remove one. Only http(s) addresses are accepted, so
              a saved value cannot become a javascript: link.
            </p>
            <div className="space-y-3">
              {links.map((link, index) => (
                <div key={link.key} className="grid md:grid-cols-2 gap-3">
                  <Input
                    name="socialLabel"
                    aria-label={`Link ${index + 1} label`}
                    placeholder="Label, e.g. Facebook"
                    defaultValue={link.label}
                    maxLength={40}
                  />
                  <Input
                    name="socialUrl"
                    aria-label={`Link ${index + 1} address`}
                    placeholder="https://…"
                    defaultValue={link.url}
                    maxLength={300}
                  />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-wrap gap-2 items-center">
          <Button type="submit">Save settings</Button>
          <span className="text-xs text-ink-500">
            {settings.updatedAt
              ? `Last updated ${new Date(settings.updatedAt).toLocaleString()}${
                  settings.updatedByProfileId ? ` by ${settings.updatedByProfileId}` : ''
                }.`
              : 'Not changed since install.'}
          </span>
        </div>
      </form>

      <AppearanceCard profile={adminProfile} />

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Needs a code change or a redeploy</h2>
          <ul className="mt-2 list-disc pl-5 space-y-1 text-sm text-ink-700">
            <li>
              <strong>Homepage headline and description</strong> — edited on the Homepage tab, not here.
            </li>
            <li>
              <strong>Favicon, app manifest and the browser theme colour</strong> — files in <code>src/app/</code>{' '}
              compiled at build time.
            </li>
            <li>
              <strong>Colour palette for surfaces</strong> — the light and dark values in <code>src/app/globals.css</code>{' '}
              and the token names in <code>tailwind.config.ts</code>. The scheme itself is each account&apos;s own choice,
              saved from this page.
            </li>
            <li>
              <strong>Which languages are offered</strong> — a translation file plus reviewed copy; see the Languages
              section of the README.
            </li>
          </ul>
          <p className="mt-2 text-xs text-ink-500">
            There is no rich-text or code editor in this area on purpose: an unbounded HTML field rendered on every page
            would be a cross-site scripting risk.
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}
