import { confirmed, handleAdminForm, required } from '@/lib/admin-actions';
import type { Category, ListingKind } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Categories are saved or deactivated here. Deleting is refused by the
 * repository while listings or group orders still use the category, so the safe
 * action (hide it from shoppers, keep the records) is the one that succeeds.
 */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const action = String(form.get('action') ?? 'save');
    if (action === 'delete') {
      const id = required(form, 'id', 'The category');
      confirmed(form, 'the deletion');
      await repo.deleteCategory(id, actor);
      return 'The unused category was deleted.';
    }

    const id = String(form.get('id') ?? '').trim();
    const kind = String(form.get('kind') ?? 'both');
    if (kind !== 'both' && kind !== 'product' && kind !== 'service') throw new Error('Unknown category kind.');
    const sortOrderRaw = String(form.get('sortOrder') ?? '');
    const input: Category = {
      id,
      name: required(form, 'name', 'The category name'),
      slug: String(form.get('slug') ?? '').trim(),
      kind: kind as ListingKind | 'both',
      description: String(form.get('description') ?? '').trim(),
      icon: String(form.get('icon') ?? '').trim() || undefined,
      sortOrder: sortOrderRaw ? Number(sortOrderRaw) : undefined,
      // A missing tick means deactivated, so the field cannot be omitted by
      // accident in a form post.
      active: form.get('active') === 'on'
    };
    if (!Number.isInteger(input.sortOrder) && input.sortOrder !== undefined) {
      throw new Error('Sort order must be a whole number.');
    }
    const saved = await repo.saveCategory(input, actor);
    return saved.active
      ? `Category “${saved.name}” saved and visible.`
      : `Category “${saved.name}” saved and hidden from browsing. Its listings keep working.`;
  });
}
