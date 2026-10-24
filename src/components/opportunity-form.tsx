'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button, Card, CardBody, Field, Input, Select, Textarea } from './ui';
import { t, type TranslationKey } from '@/lib/i18n';
import type { Category, CollectiveOpportunity, LanguageCode, ProducerGroup, UnitOfSale } from '@/lib/types';
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

const STATUS_LABELS: Record<CollectiveOpportunity['status'], TranslationKey> = {
  open: 'opportunityForm.status.open',
  closing_soon: 'opportunityForm.status.closingSoon',
  closed: 'opportunityForm.status.closed',
  fulfilled: 'opportunityForm.status.fulfilled',
  cancelled: 'opportunityForm.status.cancelled'
};

export function OpportunityForm({
  lang,
  categories,
  groups,
  initial
}: {
  lang: LanguageCode;
  categories: Category[];
  groups: ProducerGroup[];
  initial?: Partial<OpportunityFormValues>;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
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
        setResult({ ok: false, text: json?.error ?? tr('opportunityForm.saveError', { status: res.status }) });
        return;
      }
      setResult({
        ok: true,
        text: editing ? tr('opportunityForm.updated') : tr('opportunityForm.opened'),
        opportunityId: json?.opportunity?.id
      });
      router.refresh();
    } catch {
      setResult({ ok: false, text: tr('opportunityForm.networkError') });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Card>
        <CardBody className="space-y-4">
          <Field label={tr('opportunityForm.titleLabel')} htmlFor="title" required hint={tr('opportunityForm.titleHint')}>
            <Input id="title" value={draft.title} maxLength={120} onChange={(e) => set('title', e.target.value)} />
          </Field>
          <Field
            label={tr('opportunityForm.descLabel')}
            htmlFor="description"
            required
            hint={tr('opportunityForm.descHint')}
          >
            <Textarea id="description" value={draft.description} maxLength={2000} onChange={(e) => set('description', e.target.value)} />
          </Field>

          <div className="grid md:grid-cols-3 gap-4">
            <Field label={tr('filter.category')} htmlFor="categoryId" required>
              <Select id="categoryId" value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr('collective.organisingGroup')} htmlFor="organizingGroupId" required hint={tr('opportunityForm.groupHint')}>
              <Select
                id="organizingGroupId"
                value={draft.organizingGroupId}
                onChange={(e) => set('organizingGroupId', e.target.value)}
              >
                {groups.length === 0 && <option value="">{tr('opportunityForm.noGroup')}</option>}
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tr('listing.unitOfSale')} htmlFor="unitOfSale" required>
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
            <Field label={tr('opportunityForm.targetLabel', { unit: draft.unitOfSale })} htmlFor="targetQuantity" required>
              <Input
                id="targetQuantity"
                inputMode="numeric"
                value={draft.targetQuantity}
                onChange={(e) => set('targetQuantity', e.target.value.replace(/\D/g, ''))}
              />
            </Field>
            <Field label={tr('opportunityForm.indicativeLabel')} htmlFor="indicative" hint={tr('opportunityForm.indicativeHint')}>
              <Input id="indicative" inputMode="decimal" value={draft.indicativeGroupPriceEtb} onChange={(e) => set('indicativeGroupPriceEtb', e.target.value)} />
            </Field>
            <Field label={tr('opportunityForm.offeredLabel')} htmlFor="offered" hint={tr('opportunityForm.offeredHint')}>
              <Input id="offered" inputMode="decimal" value={draft.buyerOfferedPriceEtb} onChange={(e) => set('buyerOfferedPriceEtb', e.target.value)} />
            </Field>
            <Field label={tr('collective.orderDeadline')} htmlFor="orderDeadline" hint={tr('opportunityForm.deadlineHint')}>
              <Input id="orderDeadline" type="date" value={draft.orderDeadline} onChange={(e) => set('orderDeadline', e.target.value)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-4">
          <Field label={tr('opportunityForm.pickupLabel')} htmlFor="pickupPlan" required hint={tr('opportunityForm.pickupHint')}>
            <Textarea id="pickupPlan" value={draft.pickupPlan} maxLength={1200} onChange={(e) => set('pickupPlan', e.target.value)} />
          </Field>
          <Field
            label={tr('opportunityForm.transportLabel')}
            htmlFor="transportPlan"
            hint={tr('opportunityForm.transportHint')}
          >
            <Textarea
              id="transportPlan"
              value={draft.transportPlan}
              maxLength={800}
              onChange={(e) => set('transportPlan', e.target.value)}
            />
          </Field>
          {editing && (
            <Field label={tr('opportunityForm.stateLabel')} htmlFor="status" hint={tr('opportunityForm.stateHint')}>
              <Select
                id="status"
                value={draft.status}
                onChange={(e) => set('status', e.target.value as CollectiveOpportunity['status'])}
              >
                {(Object.keys(STATUS_LABELS) as CollectiveOpportunity['status'][]).map((s) => (
                  <option key={s} value={s}>
                    {tr(STATUS_LABELS[s])}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </CardBody>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? tr('opportunityForm.saving') : editing ? tr('opportunityForm.saveChanges') : tr('opportunityForm.openOpportunity')}
        </Button>
        {result?.ok && result.opportunityId && (
          <Link href={`/dashboard/collective-orders/${result.opportunityId}`} className="underline font-semibold text-clay-700 text-sm">
            {tr('opportunityForm.manageLink')}
          </Link>
        )}
      </div>
      {result && (
        <p role={result.ok ? 'status' : 'alert'} className={result.ok ? 'text-sm text-moss-700' : 'text-sm text-red-700'}>
          {result.text}
        </p>
      )}
      <p className="text-xs text-ink-500">
        {tr('opportunityForm.planningNote')}
      </p>
    </form>
  );
}

export { STATUS_LABELS };
