import { handleAdminForm, required } from '@/lib/admin-actions';
import { validateSiteSettings } from '@/lib/settings';
import { HOMEPAGE_SECTIONS, type SiteSettings } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Homepage content and layout. Which sections appear, in what order, and which
 * published listings and selling profiles are highlighted — all stored, none of
 * it hard-coded, and the page falls back to the newest records for anything left
 * unselected so it can never become an empty shell.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const sections = HOMEPAGE_SECTIONS.map((id) => ({
      id,
      visible: form.get(`section_${id}`) === 'on',
      order: Number(form.get(`order_${id}`) ?? 100)
    }));
    for (const section of sections) {
      if (!Number.isFinite(section.order)) throw new Error(`Position for “${section.id}” must be a number.`);
    }
    if (!sections.some((s) => s.visible)) throw new Error('Keep at least one homepage section visible.');

    const patch: Partial<SiteSettings> = {
      heroTitle: required(form, 'heroTitle', 'The headline'),
      heroDescription: String(form.get('heroDescription') ?? '').trim(),
      // Hidden sections stay in the stored order so they can be switched back on.
      homepageSections: sections
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map(({ id, visible }) => ({ id, visible })),
      featuredProductIds: form.getAll('featuredProduct').map(String),
      featuredServiceIds: form.getAll('featuredService').map(String),
      featuredProducerIds: form.getAll('featuredProducer').map(String)
    };

    const issue = Object.values(validateSiteSettings(patch))[0];
    if (issue) throw new Error(`Not saved — ${issue}`);

    const saved = await repo.saveSiteSettings(patch, actor);
    const shown = saved.homepageSections.filter((s) => s.visible).length;
    return `Homepage saved. ${shown} of ${saved.homepageSections.length} sections are visible, in the order you set.`;
  });
}
