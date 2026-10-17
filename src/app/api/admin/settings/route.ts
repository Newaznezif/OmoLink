import { handleAdminForm, required } from '@/lib/admin-actions';
import { validateSiteSettings } from '@/lib/settings';
import type { SiteSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Identity, contact details and appearance. Values are validated twice — once
 * here to give a readable message, and again inside the repository before
 * anything is written. Only plain text is accepted, and the accent colour has to
 * be a hex value, because a stored string is rendered on every page.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const announcementEnabled = form.get('announcementEnabled') === 'on';
    const announcementText = String(form.get('announcementText') ?? '').trim();
    if (announcementEnabled && !announcementText) {
      throw new Error('Not saved — the announcement bar needs text, or switch it off.');
    }

    const patch: Partial<SiteSettings> = {
      siteName: required(form, 'siteName', 'Site name'),
      tagline: String(form.get('tagline') ?? '').trim(),
      contactEmail: String(form.get('contactEmail') ?? '').trim(),
      contactPhone: String(form.get('contactPhone') ?? '').trim(),
      addressNote: String(form.get('addressNote') ?? '').trim(),
      footerNote: String(form.get('footerNote') ?? '').trim(),
      accentColor: String(form.get('accentColor') ?? '').trim(),
      announcementBar: { enabled: announcementEnabled, text: announcementText },
      socialLinks: readSocialLinks(form)
    };

    const issues = Object.values(validateSiteSettings(patch))[0];
    if (issues) throw new Error(`Not saved — ${issues}`);

    const saved = await repo.saveSiteSettings(patch, actor);
    return `Site settings saved. The name now shows as “${saved.siteName}”.`;
  });
}

/** Paired label/url rows from the repeated form fields; blank rows are dropped. */
function readSocialLinks(form: FormData): SiteSettings['socialLinks'] {
  const labels = form.getAll('socialLabel').map((v) => String(v).trim());
  const urls = form.getAll('socialUrl').map((v) => String(v).trim());
  return labels.flatMap((label, index) => {
    const url = urls[index] ?? '';
    return label && url ? [{ label, url }] : [];
  });
}
