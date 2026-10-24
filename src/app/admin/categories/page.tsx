import { getRepo } from '@/lib/repo';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Field, Input, Select, Textarea } from '@/components/ui';
import type { Category } from '@/lib/types';
import { getT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage({
  searchParams
}: {
  searchParams: { status?: string | string[]; error?: string | string[] };
}) {
  const t = getT();
  const repo = getRepo();
  const [categories, listings, opportunities] = await Promise.all([
    repo.listAllCategories(),
    repo.listAllListings(),
    repo.listOpportunities()
  ]);
  const usage = (id: string) => ({
    listings: listings.filter((l) => l.categoryId === id).length,
    opportunities: opportunities.filter((o) => o.categoryId === id).length
  });

  return (
    <AdminSection
      title={t('nav.categories')}
      description={t('categoryAdmin.description')}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{t('categoryAdmin.addTitle')}</h2>
          <form method="post" action="/api/admin/categories" className="mt-3 grid md:grid-cols-2 gap-3">
            <BackField path="/admin/categories" />
            <input type="hidden" name="action" value="save" />
            <input type="hidden" name="id" value="" />
            <Field label={t('categoryAdmin.nameLabel')} htmlFor="new-name" required>
              <Input id="new-name" name="name" maxLength={80} />
            </Field>
            <Field label={t('categoryAdmin.slugLabel')} htmlFor="new-slug" hint={t('categoryAdmin.slugHint')}>
              <Input id="new-slug" name="slug" />
            </Field>
            <Field label={t('categoryAdmin.containsLabel')} htmlFor="new-kind">
              <Select id="new-kind" name="kind" defaultValue="both">
                <option value="both">{t('categoryAdmin.kindBoth')}</option>
                <option value="product">{t('categoryAdmin.kindProduct')}</option>
                <option value="service">{t('categoryAdmin.kindService')}</option>
              </Select>
            </Field>
            <Field label={t('categoryAdmin.iconLabel')} htmlFor="new-icon" hint={t('categoryAdmin.iconHint')}>
              <Input id="new-icon" name="icon" maxLength={4} />
            </Field>
            <Field label={t('categoryAdmin.orderLabel')} htmlFor="new-order" hint={t('categoryAdmin.orderHint')}>
              <Input id="new-order" name="sortOrder" type="number" step="1" defaultValue="999" />
            </Field>
            <div className="md:col-span-2">
              <Field label={t('listing.descriptionTitle')} htmlFor="new-description">
                <Textarea id="new-description" name="description" />
              </Field>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <label htmlFor="new-active" className="flex items-center gap-2 text-sm">
                <input id="new-active" name="active" type="checkbox" value="on" defaultChecked className="h-4 w-4" />
                {t('categoryAdmin.visibleLabel')}
              </label>
              <Button type="submit">{t('categoryAdmin.addSubmit')}</Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {categories.map((category) => (
          <CategoryRow key={category.id} category={category} usage={usage(category.id)} />
        ))}
      </div>
    </AdminSection>
  );
}

function CategoryRow({
  category,
  usage
}: {
  category: Category;
  usage: { listings: number; opportunities: number };
}) {
  const t = getT();
  const inUse = usage.listings + usage.opportunities > 0;
  return (
    <Card>
      <CardBody>
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <h3 className="font-semibold text-ink-900">
            {category.icon ? <span aria-hidden className="mr-2">{category.icon}</span> : null}
            {category.name}
          </h3>
          <code className="text-xs text-ink-500">/{category.slug}</code>
          {category.active === false ? <Badge tone="warning">{t('categoryAdmin.badgeHidden')}</Badge> : <Badge tone="success">{t('categoryAdmin.badgeVisible')}</Badge>}
          <span className="text-xs text-ink-500">
            {t('categoryAdmin.usage', { listings: usage.listings, opportunities: usage.opportunities })}
          </span>
        </div>

        <form method="post" action="/api/admin/categories" className="grid md:grid-cols-4 gap-3">
          <BackField path="/admin/categories" />
          <input type="hidden" name="action" value="save" />
          <input type="hidden" name="id" value={category.id} />
          <Field label={t('categoryAdmin.nameLabel')} htmlFor={`name-${category.id}`}>
            <Input id={`name-${category.id}`} name="name" defaultValue={category.name} maxLength={80} />
          </Field>
          <Field label={t('categoryAdmin.slugLabel')} htmlFor={`slug-${category.id}`}>
            <Input id={`slug-${category.id}`} name="slug" defaultValue={category.slug} />
          </Field>
          <Field label={t('categoryAdmin.containsLabel')} htmlFor={`kind-${category.id}`}>
            <Select id={`kind-${category.id}`} name="kind" defaultValue={category.kind}>
              <option value="both">{t('categoryAdmin.kindBoth')}</option>
              <option value="product">{t('categoryAdmin.kindProduct')}</option>
              <option value="service">{t('categoryAdmin.kindService')}</option>
            </Select>
          </Field>
          <Field label={t('categoryAdmin.orderLabel')} htmlFor={`order-${category.id}`}>
            <Input id={`order-${category.id}`} name="sortOrder" type="number" step="1" defaultValue={String(category.sortOrder ?? '')} />
          </Field>
          <Field label={t('categoryAdmin.iconLabel')} htmlFor={`icon-${category.id}`}>
            <Input id={`icon-${category.id}`} name="icon" defaultValue={category.icon ?? ''} maxLength={4} />
          </Field>
          <div className="md:col-span-3">
            <Field label={t('listing.descriptionTitle')} htmlFor={`description-${category.id}`}>
              <Textarea id={`description-${category.id}`} name="description" defaultValue={category.description} />
            </Field>
          </div>
          <div className="md:col-span-4 flex flex-wrap items-center gap-4">
            <label htmlFor={`active-${category.id}`} className="flex items-center gap-2 text-sm">
              <input
                id={`active-${category.id}`}
                name="active"
                type="checkbox"
                value="on"
                defaultChecked={category.active !== false}
                className="h-4 w-4"
              />
              {t('categoryAdmin.visibleLabel')}
            </label>
            <Button type="submit" size="sm">
              {t('listingForm.saveChanges')}
            </Button>
          </div>
        </form>

        {!inUse ? (
          <form method="post" action="/api/admin/categories" className="mt-3 border-t border-ink-100 pt-3">
            <BackField path="/admin/categories" />
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="id" value={category.id} />
            <ConfirmField id={`del-${category.id}`} label={t('categoryAdmin.confirmDelete')} />
            <Button type="submit" size="sm" variant="danger" className="mt-2">
              {t('categoryAdmin.deleteSubmit')}
            </Button>
          </form>
        ) : (
          <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
            {t('categoryAdmin.deleteBlocked', { listings: usage.listings, opportunities: usage.opportunities })}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
