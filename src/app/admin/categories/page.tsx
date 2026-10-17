import { getRepo } from '@/lib/repo';
import { AdminSection, BackField, ConfirmField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Field, Input, Select, Textarea } from '@/components/ui';
import type { Category } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function AdminCategoriesPage({
  searchParams
}: {
  searchParams: { status?: string | string[]; error?: string | string[] };
}) {
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
      title="Categories"
      description="Shoppers browse these groups. A category that still has listings or group orders cannot be deleted — deactivate it instead, so the records keep their classification."
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Add a category</h2>
          <form method="post" action="/api/admin/categories" className="mt-3 grid md:grid-cols-2 gap-3">
            <BackField path="/admin/categories" />
            <input type="hidden" name="action" value="save" />
            <input type="hidden" name="id" value="" />
            <Field label="Name" htmlFor="new-name" required>
              <Input id="new-name" name="name" maxLength={80} />
            </Field>
            <Field label="Web address" htmlFor="new-slug" hint="Leave empty to build it from the name. Must stay unique.">
              <Input id="new-slug" name="slug" />
            </Field>
            <Field label="Contains" htmlFor="new-kind">
              <Select id="new-kind" name="kind" defaultValue="both">
                <option value="both">Products and services</option>
                <option value="product">Products only</option>
                <option value="service">Services only</option>
              </Select>
            </Field>
            <Field label="Short label" htmlFor="new-icon" hint="A text label shown beside the name. No image file is invented.">
              <Input id="new-icon" name="icon" maxLength={4} />
            </Field>
            <Field label="Position" htmlFor="new-order" hint="Lower numbers show first.">
              <Input id="new-order" name="sortOrder" type="number" step="1" defaultValue="999" />
            </Field>
            <div className="md:col-span-2">
              <Field label="Description" htmlFor="new-description">
                <Textarea id="new-description" name="description" />
              </Field>
            </div>
            <div className="md:col-span-2 flex flex-wrap items-center gap-4">
              <label htmlFor="new-active" className="flex items-center gap-2 text-sm">
                <input id="new-active" name="active" type="checkbox" value="on" defaultChecked className="h-4 w-4" />
                Visible to shoppers
              </label>
              <Button type="submit">Add category</Button>
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
          {category.active === false ? <Badge tone="warning">hidden from browsing</Badge> : <Badge tone="success">visible</Badge>}
          <span className="text-xs text-ink-500">
            {usage.listings} listing(s), {usage.opportunities} group order(s)
          </span>
        </div>

        <form method="post" action="/api/admin/categories" className="grid md:grid-cols-4 gap-3">
          <BackField path="/admin/categories" />
          <input type="hidden" name="action" value="save" />
          <input type="hidden" name="id" value={category.id} />
          <Field label="Name" htmlFor={`name-${category.id}`}>
            <Input id={`name-${category.id}`} name="name" defaultValue={category.name} maxLength={80} />
          </Field>
          <Field label="Web address" htmlFor={`slug-${category.id}`}>
            <Input id={`slug-${category.id}`} name="slug" defaultValue={category.slug} />
          </Field>
          <Field label="Contains" htmlFor={`kind-${category.id}`}>
            <Select id={`kind-${category.id}`} name="kind" defaultValue={category.kind}>
              <option value="both">Products and services</option>
              <option value="product">Products only</option>
              <option value="service">Services only</option>
            </Select>
          </Field>
          <Field label="Position" htmlFor={`order-${category.id}`}>
            <Input id={`order-${category.id}`} name="sortOrder" type="number" step="1" defaultValue={String(category.sortOrder ?? '')} />
          </Field>
          <Field label="Short label" htmlFor={`icon-${category.id}`}>
            <Input id={`icon-${category.id}`} name="icon" defaultValue={category.icon ?? ''} maxLength={4} />
          </Field>
          <div className="md:col-span-3">
            <Field label="Description" htmlFor={`description-${category.id}`}>
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
              Visible to shoppers
            </label>
            <Button type="submit" size="sm">
              Save changes
            </Button>
          </div>
        </form>

        {!inUse ? (
          <form method="post" action="/api/admin/categories" className="mt-3 border-t border-ink-100 pt-3">
            <BackField path="/admin/categories" />
            <input type="hidden" name="action" value="delete" />
            <input type="hidden" name="id" value={category.id} />
            <ConfirmField id={`del-${category.id}`} label="I confirm this category is unused and may be removed." />
            <Button type="submit" size="sm" variant="danger" className="mt-2">
              Delete category
            </Button>
          </form>
        ) : (
          <p className="mt-3 border-t border-ink-100 pt-3 text-xs text-ink-500">
            Deletion is blocked while {usage.listings} listing(s) and {usage.opportunities} group order(s) use this
            category. Untick “Visible to shoppers” to hide it instead.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
