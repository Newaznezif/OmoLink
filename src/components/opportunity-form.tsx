'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from './ui';
import type { Category, CollectiveOpportunity, ProducerGroup, UnitOfSale } from '@/lib/types';
import { UNIT_OF_SALES } from '@/lib/types';

export type OpportunityFormValues = {
  id?: string;
  title: string;
  description: string;
  categoryId: string;
  organizingGroupId: string;
  unitOfSale: UnitOfSale;
  targetQuantity: string;
  indicativeGroupPriceEtb: string;
  buyerOfferedPriceEtb: string;
  pickupPlan: string;
  transportPlan: string;
  orderDeadline: string;
  status: CollectiveOpportunity['status'];
};

const STATUS_LABELS: Record<CollectiveOpportunity['status'], string> = {
  open: 'Open for contributions',
  closing_soon: 'Closing soon',
  closed: 'Closed — no more contributions',
  fulfilled: 'Fulfilled — the goods were delivered',
  cancelled: 'Cancelled'
};

export function OpportunityForm({
  categories,
  groups,
  initial
}: {
  categories: Category[];
  groups: ProducerGroup[];
  initial?: Partial<OpportunityFormValues>;
}) {
  const router = useRouter();
  const editing = Boolean(initial?.id);
  const [draft, setDraft] = useState<OpportunityFormValues>(() => ({
    id: initial?.id,
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    organizingGroupId: initial?.organizingGroupId ?? groups[0]?.id ?? '',
    unitOfSale: initial?.unitOfSale ?? 'kg',
    targetQuantity: initial?.targetQuantity ?? '',
    indicativeGroupPriceEtb: initial?.indicativeGroupPriceEtb ?? '',
    buyerOfferedPriceEtb: initial?.buyerOfferedPriceEtb ?? '',
    pickupPlan: initial?.pickupPlan ?? '',
    transportPlan: initial?.transportPlan ?? '',
    orderDeadline: initial?.orderDeadline ?? '',
    status: initial?.status ?? 'open'
  }));
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string; opportunityId?: string } | null>(null);

  const set = <K extends keyof OpportunityFormValues>(key: K, value: OpportunityFormValues[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    try {
      const res = await fetch('/api/collective/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(draft)
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setResult({ ok: false, text: json?.error ?? `Could not save (status ${res.status}).` });
        return;
      }
      setResult({
        ok: true,
        text: editing ? 'Opportunity updated.' : 'Opportunity opened. Members of the group can now contribute.',
        opportunityId: json?.opportunity?.id
      });
      router.refresh();
    } catch {
      setResult({ ok: false, text: 'Network problem: nothing was saved. Try again.' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <Field label="Title" htmlFor="title" required hint="What buyers and members read in the list of group orders.">
            <Input id="title" value={draft.title} maxLength={120} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field
            label="What is being collected, and on what terms"
            htmlFor="description"
            required
            hint="20 characters minimum. Say what the buyer wants and what a member is expected to bring."
          >
            <Textarea id="description" value={draft.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Category" htmlFor="categoryId" required>
              <Select id="categoryId" value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Organising group" htmlFor="organizingGroupId" required hint="Only groups you coordinate are accepted.">
              <Select
                id="organizingGroupId"
                value={draft.organizingGroupId}
                onChange={(e) => set('organizingGroupId', e.target.value)}
              >
                {groups.length === 0 && <option value="">No group available</option>}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Unit of sale" htmlFor="unitOfSale" required>
              <Select id="unitOfSale" value={draft.unitOfSale} onChange={(e) => set('unitOfSale', e.target.value as UnitOfSale)}>
                {UNIT_OF_SALES.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            <Field label={`Target quantity (${draft.unitOfSale})`} htmlFor="targetQuantity" required>
              <Input
                id="targetQuantity"
                inputMode="numeric"
                value={draft.targetQuantity}
                onChange={(e) => set('targetQuantity', e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field label="Indicative price per unit (ETB)" htmlFor="indicative" hint="Optional. An estimate for planning, never an invoice.">
              <Input id="indicative" inputMode="decimal" value={draft.indicativeGroupPriceEtb} onChange={(e) => set('indicativeGroupPriceEtb', e.target.value)} />
            </Field>
            <Field label="Buyer offered price per unit (ETB)" htmlFor="offered" hint="Optional. What the buyer has said they would pay.">
              <Input id="offered" inputMode="decimal" value={draft.buyerOfferedPriceEtb} onChange={(e) => set('buyerOfferedPriceEtb', e.target.value)} />
            </Field>
            <Field label="Order deadline" htmlFor="orderDeadline" hint="Optional date the group stops collecting.">
              <Input id="orderDeadline" type="date" value={draft.orderDeadline} onChange={(e) => set('orderDeadline', e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <Field label="Pickup plan" htmlFor="pickupPlan" required hint="Where members bring goods and where the buyer collects.">
            <Textarea id="pickupPlan" value={draft.pickupPlan} maxLength={1200} onChange={(e) => set('pickupPlan', e.target.value)} />
          </Field>
          <Field
            label="Transport plan"
            htmlFor="transportPlan"
            hint="Optional. Share the vehicle and the split, but say it is an estimate unless a quote is confirmed."
          >
            <Textarea
              id="transportPlan"
              value={draft.transportPlan}
              maxLength={800}
              onChange={(e) => set('transportPlan', e.target.value)}
            />
          </Field>
          {editing && (
            <Field label="State" htmlFor="status" hint="Fulfilled means the goods were actually delivered; do not set it early.">
              <Select
                id="status"
                value={draft.status}
                onChange={(e) => set('status', e.target.value as CollectiveOpportunity['status'])}
              >
                {(Object.keys(STATUS_LABELS) as CollectiveOpportunity['status'][]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? 'Saving…' : editing ? 'Save changes' : 'Open the opportunity'}
        </Button>
        {result?.ok && result.opportunityId && (
          <Link href={`/dashboard/collective-orders/${result.opportunityId}`} className="underline font-semibold text-clay-700 text-sm">
            Manage contributions for this opportunity →
          </Link>
        )}
      </div>
      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'text-sm text-moss-700' : 'text-sm text-red-700'}>
          {result.text}
        </p>
      )}
      <p className="text-xs text-ink-500">
        Prices entered here are planning figures shared with the group. OmoNetTab moves no money: who pays what, and when,
        is agreed between the buyer and the members and recorded in the notes.
      </p>
    </form>
  );
}

export { STATUS_LABELS };
