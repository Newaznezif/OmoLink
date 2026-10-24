'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, LanguageCode, UnitOfSale } from '@/lib/types';
import { t, type TranslationKey } from '@/lib/i18n';
import { Button, Card, CardBody, Field, Input, Select, Textarea, Badge } from './ui';
import { useListingDraft } from '@/hooks/use-listing-draft';

export type ListingFormValues = {
  kind: 'product' | 'service';
  title: string;
  description: string;
  categoryId: string;
  unitPriceEtb: string;
  unitOfSale: UnitOfSale;
  availableQuantity: string;
  minOrderQuantity: string;
  availability: 'available' | 'limited' | 'made_to_order' | 'seasonal' | 'unavailable';
  pickupOptions: string;
  deliveryAvailable: boolean;
  publish: boolean;
  tourism: {
    packageName: string;
    durationHours: string;
    groupCapacity: string;
    inclusions: string;
    exclusions: string;
    bookingConditions: string;
    meetingPoint: string;
    cancellationPolicy: string;
  };
};

export function ListingForm({
  lang,
  categories,
  producerId,
  initial,
  listingId
}: {
  lang: LanguageCode;
  categories: Category[];
  producerId: string;
  initial?: Partial<ListingFormValues>;
  listingId?: string;
}) {
  const router = useRouter();
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const [values, setValues] = useState<ListingFormValues>(() => ({
    kind: initial?.kind ?? 'product',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    categoryId: initial?.categoryId ?? categories[0]?.id ?? '',
    unitPriceEtb: initial?.unitPriceEtb ?? '',
    unitOfSale: initial?.unitOfSale ?? 'item',
    availableQuantity: initial?.availableQuantity ?? '1',
    minOrderQuantity: initial?.minOrderQuantity ?? '1',
    availability: initial?.availability ?? 'available',
    pickupOptions: initial?.pickupOptions ?? 'Weekly market day pickup',
    deliveryAvailable: initial?.deliveryAvailable ?? false,
    publish: initial?.publish ?? false,
    tourism: initial?.tourism ?? {
      packageName: '',
      durationHours: '',
      groupCapacity: '',
      inclusions: '',
      exclusions: '',
      bookingConditions: '',
      meetingPoint: '',
      cancellationPolicy: ''
    }
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const { status, saveDraft, clearDraft, sync } = useListingDraft(producerId, listingId);
  const [created, setCreated] = useState(false);
  // React state lands a tick late, so two submits fired back to back would both
  // read busy as false; this ref is checked synchronously instead.
  const inFlightRef = useRef(false);

  function update<K extends keyof ListingFormValues>(key: K, value: ListingFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function onSaveDraft() {
    saveDraft(values);
    setMessage({ tone: 'ok', text: tr('listingForm.draftSaved') });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlightRef.current) return;
    // A create is not idempotent: the server has no request id to deduplicate
    // against, so a second POST would publish a second listing.
    if (created) {
      setMessage({ tone: 'ok', text: tr('listingForm.alreadyCreated') });
      return;
    }
    if (!listingId && typeof navigator !== 'undefined' && navigator.onLine === false) {
      setMessage({
        tone: 'err',
        text: tr('listingForm.offlineCreate')
      });
      return;
    }
    inFlightRef.current = true;
    setBusy(true);
    setErrors({});
    setMessage(null);
    const errs = validate(values, tr);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      inFlightRef.current = false;
      setBusy(false);
      return;
    }
    try {
      const url = listingId ? `/api/listings/${listingId}` : '/api/listings';
      const res = await fetch(url, {
        method: listingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ producerId, ...values })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? tr('listingForm.saveFailed'));
      clearDraft();
      if (!listingId) setCreated(true);
      setMessage({ tone: 'ok', text: listingId ? tr('listingForm.updated') : tr('listingForm.created') });
      router.push('/dashboard/listings');
      router.refresh();
    } catch (err: unknown) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : tr('listingForm.genericError') });
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  async function onSync() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setBusy(true);
    try {
      await sync(values);
      setMessage({ tone: 'ok', text: tr('listingForm.syncedToServer') });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : tr('listingForm.syncFailed') });
    } finally {
      inFlightRef.current = false;
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-ink-900">{tr('listingForm.basicHeading')}</h2>
            <SyncBadge lang={lang} status={status} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={tr('listingForm.typeLabel')} htmlFor="kind" required>
              <Select id="kind" value={values.kind} onChange={(e) => update('kind', e.target.value as 'product' | 'service')}>
                <option value="product">{tr('listingForm.typeProduct')}</option>
                <option value="service">{tr('listingForm.typeService')}</option>
              </Select>
            </Field>
            <Field label={tr('filter.category')} htmlFor="categoryId" required>
              <Select id="categoryId" value={values.categoryId} onChange={(e) => update('categoryId', e.target.value)}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="mt-4">
            <Field label={tr('listingForm.titleLabel')} htmlFor="title" required error={errors.title}>
              <Input id="title" value={values.title} onChange={(e) => update('title', e.target.value)} invalid={Boolean(errors.title)} maxLength={120} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label={tr('listing.descriptionTitle')} htmlFor="description" required error={errors.description} hint={tr('listingForm.descriptionHint')}>
              <Textarea id="description" value={values.description} onChange={(e) => update('description', e.target.value)} invalid={Boolean(errors.description)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">{tr('listing.pricingTitle')}</h2>
          <div className="mt-3 grid md:grid-cols-2 gap-4">
            <Field label={tr('listingForm.unitPriceLabel')} htmlFor="unitPriceEtb" required error={errors.unitPriceEtb} hint={tr('listingForm.priceHint')}>
              <Input id="unitPriceEtb" inputMode="decimal" value={values.unitPriceEtb} onChange={(e) => update('unitPriceEtb', e.target.value)} invalid={Boolean(errors.unitPriceEtb)} />
            </Field>
            <Field label={tr('listing.unitOfSale')} htmlFor="unitOfSale" required>
              <Select id="unitOfSale" value={values.unitOfSale} onChange={(e) => update('unitOfSale', e.target.value as UnitOfSale)}>
                <option value="item">{tr('listingForm.unit.item')}</option>
                <option value="kg">{tr('listingForm.unit.kg')}</option>
                <option value="bundle">{tr('listingForm.unit.bundle')}</option>
                <option value="liter">{tr('listingForm.unit.liter')}</option>
                <option value="person">{tr('listingForm.unit.person')}</option>
                <option value="group">{tr('listingForm.unit.group')}</option>
                <option value="package">{tr('listingForm.unit.package')}</option>
                <option value="day">{tr('listingForm.unit.day')}</option>
                <option value="service">{tr('listingForm.unit.service')}</option>
              </Select>
            </Field>
            <Field label={tr('listing.availableQuantity')} htmlFor="availableQuantity" required error={errors.availableQuantity}>
              <Input id="availableQuantity" inputMode="numeric" value={values.availableQuantity} onChange={(e) => update('availableQuantity', e.target.value.replace(/\D/g, ''))} invalid={Boolean(errors.availableQuantity)} />
            </Field>
            <Field label={tr('listingForm.minOrderLabel')} htmlFor="minOrderQuantity" required error={errors.minOrderQuantity}>
              <Input id="minOrderQuantity" inputMode="numeric" value={values.minOrderQuantity} onChange={(e) => update('minOrderQuantity', e.target.value.replace(/\D/g, ''))} invalid={Boolean(errors.minOrderQuantity)} />
            </Field>
            <Field label={tr('listingForm.availabilityStatusLabel')} htmlFor="availability" required>
              <Select id="availability" value={values.availability} onChange={(e) => update('availability', e.target.value as ListingFormValues['availability'])}>
                <option value="available">{tr('status.available')}</option>
                <option value="limited">{tr('status.limitedOption')}</option>
                <option value="made_to_order">{tr('status.madeToOrder')}</option>
                <option value="seasonal">{tr('status.seasonal')}</option>
                <option value="unavailable">{tr('status.unavailable')}</option>
              </Select>
            </Field>
            <Field label={tr('listing.pickupTitle')} htmlFor="pickupOptions" hint={tr('listingForm.pickupHint')}>
              <Textarea id="pickupOptions" value={values.pickupOptions} onChange={(e) => update('pickupOptions', e.target.value)} />
            </Field>
            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={values.deliveryAvailable} onChange={(e) => update('deliveryAvailable', e.target.checked)} className="w-4 h-4" />
              <span>{tr('listingForm.deliveryLabel')}</span>
            </label>
            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={values.publish} onChange={(e) => update('publish', e.target.checked)} className="w-4 h-4" />
              <span>{tr('listingForm.publishLabel')}</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {values.kind === 'service' && (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">{tr('listingForm.tourismHeading')}</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <Field label={tr('listingForm.packageLabel')} htmlFor="tpn">
                <Input id="tpn" value={values.tourism.packageName} onChange={(e) => update('tourism', { ...values.tourism, packageName: e.target.value })} />
              </Field>
              <Field label={tr('listingForm.durationLabel')} htmlFor="tdur">
                <Input id="tdur" inputMode="numeric" value={values.tourism.durationHours} onChange={(e) => update('tourism', { ...values.tourism, durationHours: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label={tr('listing.groupCapacity')} htmlFor="tcap">
                <Input id="tcap" inputMode="numeric" value={values.tourism.groupCapacity} onChange={(e) => update('tourism', { ...values.tourism, groupCapacity: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label={tr('listing.meetingPoint')} htmlFor="tmp">
                <Input id="tmp" value={values.tourism.meetingPoint} onChange={(e) => update('tourism', { ...values.tourism, meetingPoint: e.target.value })} />
              </Field>
              <Field label={tr('listingForm.inclusionsLabel')} htmlFor="tinc">
                <Input id="tinc" value={values.tourism.inclusions} onChange={(e) => update('tourism', { ...values.tourism, inclusions: e.target.value })} />
              </Field>
              <Field label={tr('listingForm.exclusionsLabel')} htmlFor="texc">
                <Input id="texc" value={values.tourism.exclusions} onChange={(e) => update('tourism', { ...values.tourism, exclusions: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label={tr('listing.bookingConditions')} htmlFor="tbc">
                  <Textarea id="tbc" value={values.tourism.bookingConditions} onChange={(e) => update('tourism', { ...values.tourism, bookingConditions: e.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label={tr('listingForm.cancellationLabel')} htmlFor="tcan">
                  <Textarea id="tcan" value={values.tourism.cancellationPolicy} onChange={(e) => update('tourism', { ...values.tourism, cancellationPolicy: e.target.value })} />
                </Field>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-500">
              {tr('listingForm.tourismNote')}
            </p>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Button type="submit" disabled={busy || created}>
          {created ? tr('listingForm.buttonCreated') : busy ? tr('listingForm.saving') : listingId ? tr('listingForm.saveChanges') : tr('listingForm.create')}
        </Button>
        <Button type="button" variant="secondary" onClick={onSaveDraft}>
          {tr('listingForm.saveDraft')}
        </Button>
        {status === 'pending' && (
          <Button type="button" variant="secondary" onClick={onSync} disabled={busy}>
            {tr('listingForm.syncDraft')}
          </Button>
        )}
        {status !== 'idle' && (
          <Button type="button" variant="ghost" onClick={clearDraft}>
            {tr('listingForm.clearDraft')}
          </Button>
        )}
      </div>
      {message && (
        <div
          role="status"
          className={'rounded-lg p-3 text-sm border ' + (message.tone === 'ok' ? 'bg-moss-50 text-moss-700 border-moss-100' : 'bg-red-50 text-red-700 border-red-100')}
        >
          {message.text}
        </div>
      )}
    </form>
  );
}

function SyncBadge({ lang, status }: { lang: LanguageCode; status: 'idle' | 'local' | 'pending' | 'synced' | 'failed' }) {
  const map: Record<'idle' | 'local' | 'pending' | 'synced' | 'failed', { tone: 'neutral' | 'info' | 'warning' | 'success' | 'danger'; labelKey: TranslationKey }> = {
    idle: { tone: 'neutral', labelKey: 'listingForm.syncIdle' },
    local: { tone: 'info', labelKey: 'listingForm.syncLocal' },
    pending: { tone: 'warning', labelKey: 'listingForm.syncPending' },
    synced: { tone: 'success', labelKey: 'listingForm.syncSynced' },
    failed: { tone: 'danger', labelKey: 'listingForm.syncFailedBadge' }
  };
  const s = map[status];
  return <Badge tone={s.tone}>{t(lang, s.labelKey)}</Badge>;
}

function validate(values: ListingFormValues, tr: (key: TranslationKey, vars?: Record<string, string | number>) => string): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim() || values.title.trim().length < 4) errors.title = tr('listingForm.errorTitleMin', { min: 4 });
  if (!values.description.trim() || values.description.trim().length < 20) errors.description = tr('listingForm.errorDescriptionMin', { min: 20 });
  const price = Number(values.unitPriceEtb);
  if (!Number.isFinite(price) || price <= 0) errors.unitPriceEtb = tr('listingForm.errorPrice');
  else if (!/^\d{1,9}(\.\d{1,2})?$/.test(values.unitPriceEtb.trim())) errors.unitPriceEtb = tr('listingForm.errorDecimals', { max: 2 });
  const qty = Number(values.availableQuantity);
  if (!Number.isInteger(qty) || qty < 0) errors.availableQuantity = tr('listingForm.errorQuantityWhole');
  const min = Number(values.minOrderQuantity);
  if (!Number.isInteger(min) || min < 1) errors.minOrderQuantity = tr('listingForm.errorMinOrder', { min: 1 });
  if (Number.isInteger(qty) && Number.isInteger(min) && qty > 0 && min > qty && values.availability !== 'made_to_order') {
    errors.minOrderQuantity = tr('listingForm.errorMinExceeds');
  }
  return errors;
}
