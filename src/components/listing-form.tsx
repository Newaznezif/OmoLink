'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Category, UnitOfSale } from '@/lib/types';
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
  categories,
  producerId,
  initial,
  listingId
}: {
  categories: Category[];
  producerId: string;
  initial?: Partial<ListingFormValues>;
  listingId?: string;
}) {
  const router = useRouter();
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
    setMessage({ tone: 'ok', text: 'Draft saved on this device. You can close the tab and come back.' });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (inFlightRef.current) return;
    // A create is not idempotent: the server has no request id to deduplicate
    // against, so a second POST would publish a second listing.
    if (created) {
      setMessage({ tone: 'ok', text: 'This listing has already been created. Open it from the listing list to change it.' });
      return;
    }
    if (!listingId && typeof navigator !== 'undefined' && navigator.onLine === false) {
      setMessage({
        tone: 'err',
        text: 'Creating a listing needs a connection: the server has to receive it. Use “Save draft on device” now and sync it when the network returns.'
      });
      return;
    }
    inFlightRef.current = true;
    setBusy(true);
    setErrors({});
    setMessage(null);
    const errs = validate(values);
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
      if (!res.ok) throw new Error(json?.error ?? 'Failed to save listing.');
      clearDraft();
      if (!listingId) setCreated(true);
      setMessage({ tone: 'ok', text: listingId ? 'Listing updated.' : 'Listing created.' });
      router.push('/dashboard/listings');
      router.refresh();
    } catch (err: unknown) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Something went wrong.' });
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
      setMessage({ tone: 'ok', text: 'Draft synced to the server.' });
      router.refresh();
    } catch (err: unknown) {
      setMessage({ tone: 'err', text: err instanceof Error ? err.message : 'Sync failed. Try again.' });
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
            <h2 className="font-semibold text-ink-900">Basic information</h2>
            <SyncBadge status={status} />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="Listing type" htmlFor="kind" required>
              <Select id="kind" value={values.kind} onChange={(e) => update('kind', e.target.value as 'product' | 'service')}>
                <option value="product">Product</option>
                <option value="service">Service / tourism</option>
              </Select>
            </Field>
            <Field label="Category" htmlFor="categoryId" required>
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
            <Field label="Title" htmlFor="title" required error={errors.title}>
              <Input id="title" value={values.title} onChange={(e) => update('title', e.target.value)} invalid={Boolean(errors.title)} maxLength={120} />
            </Field>
          </div>
          <div className="mt-4">
            <Field label="Description" htmlFor="description" required error={errors.description} hint="Include what the buyer receives, how it is made, and any constraints. Do not include sensitive cultural knowledge.">
              <Textarea id="description" value={values.description} onChange={(e) => update('description', e.target.value)} invalid={Boolean(errors.description)} />
            </Field>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Pricing and stock</h2>
          <div className="mt-3 grid md:grid-cols-2 gap-4">
            <Field label="Unit price (ETB)" htmlFor="unitPriceEtb" required error={errors.unitPriceEtb} hint="Two decimals allowed.">
              <Input id="unitPriceEtb" inputMode="decimal" value={values.unitPriceEtb} onChange={(e) => update('unitPriceEtb', e.target.value)} invalid={Boolean(errors.unitPriceEtb)} />
            </Field>
            <Field label="Unit of sale" htmlFor="unitOfSale" required>
              <Select id="unitOfSale" value={values.unitOfSale} onChange={(e) => update('unitOfSale', e.target.value as UnitOfSale)}>
                <option value="item">item</option>
                <option value="kg">kg</option>
                <option value="bundle">bundle</option>
                <option value="liter">liter</option>
                <option value="person">person</option>
                <option value="group">group</option>
                <option value="package">package</option>
                <option value="day">day</option>
                <option value="service">service</option>
              </Select>
            </Field>
            <Field label="Available quantity" htmlFor="availableQuantity" required error={errors.availableQuantity}>
              <Input id="availableQuantity" inputMode="numeric" value={values.availableQuantity} onChange={(e) => update('availableQuantity', e.target.value.replace(/\D/g, ''))} invalid={Boolean(errors.availableQuantity)} />
            </Field>
            <Field label="Minimum order quantity" htmlFor="minOrderQuantity" required error={errors.minOrderQuantity}>
              <Input id="minOrderQuantity" inputMode="numeric" value={values.minOrderQuantity} onChange={(e) => update('minOrderQuantity', e.target.value.replace(/\D/g, ''))} invalid={Boolean(errors.minOrderQuantity)} />
            </Field>
            <Field label="Availability status" htmlFor="availability" required>
              <Select id="availability" value={values.availability} onChange={(e) => update('availability', e.target.value as ListingFormValues['availability'])}>
                <option value="available">Available</option>
                <option value="limited">Limited</option>
                <option value="made_to_order">Made to order</option>
                <option value="seasonal">Seasonal</option>
                <option value="unavailable">Unavailable</option>
              </Select>
            </Field>
            <Field label="Pickup options" htmlFor="pickupOptions" hint="One per line.">
              <Textarea id="pickupOptions" value={values.pickupOptions} onChange={(e) => update('pickupOptions', e.target.value)} />
            </Field>
            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={values.deliveryAvailable} onChange={(e) => update('deliveryAvailable', e.target.checked)} className="w-4 h-4" />
              <span>Delivery is available on request</span>
            </label>
            <label className="flex gap-2 items-center text-sm">
              <input type="checkbox" checked={values.publish} onChange={(e) => update('publish', e.target.checked)} className="w-4 h-4" />
              <span>Publish immediately (otherwise saved as draft on the server)</span>
            </label>
          </div>
        </CardBody>
      </Card>

      {values.kind === 'service' && (
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Tourism / service details</h2>
            <div className="mt-3 grid md:grid-cols-2 gap-4">
              <Field label="Package name" htmlFor="tpn">
                <Input id="tpn" value={values.tourism.packageName} onChange={(e) => update('tourism', { ...values.tourism, packageName: e.target.value })} />
              </Field>
              <Field label="Duration (hours)" htmlFor="tdur">
                <Input id="tdur" inputMode="numeric" value={values.tourism.durationHours} onChange={(e) => update('tourism', { ...values.tourism, durationHours: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Group capacity" htmlFor="tcap">
                <Input id="tcap" inputMode="numeric" value={values.tourism.groupCapacity} onChange={(e) => update('tourism', { ...values.tourism, groupCapacity: e.target.value.replace(/\D/g, '') })} />
              </Field>
              <Field label="Meeting point" htmlFor="tmp">
                <Input id="tmp" value={values.tourism.meetingPoint} onChange={(e) => update('tourism', { ...values.tourism, meetingPoint: e.target.value })} />
              </Field>
              <Field label="Inclusions (comma separated)" htmlFor="tinc">
                <Input id="tinc" value={values.tourism.inclusions} onChange={(e) => update('tourism', { ...values.tourism, inclusions: e.target.value })} />
              </Field>
              <Field label="Exclusions (comma separated)" htmlFor="texc">
                <Input id="texc" value={values.tourism.exclusions} onChange={(e) => update('tourism', { ...values.tourism, exclusions: e.target.value })} />
              </Field>
              <div className="md:col-span-2">
                <Field label="Booking conditions" htmlFor="tbc">
                  <Textarea id="tbc" value={values.tourism.bookingConditions} onChange={(e) => update('tourism', { ...values.tourism, bookingConditions: e.target.value })} />
                </Field>
              </div>
              <div className="md:col-span-2">
                <Field label="Cancellation policy" htmlFor="tcan">
                  <Textarea id="tcan" value={values.tourism.cancellationPolicy} onChange={(e) => update('tourism', { ...values.tourism, cancellationPolicy: e.target.value })} />
                </Field>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-500">
              Sensitive cultural knowledge is never commercialised by default. Performances and ceremonies are only
              published with recorded community consent.
            </p>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <Button type="submit" disabled={busy || created}>
          {created ? 'Listing created' : busy ? 'Saving…' : listingId ? 'Save changes' : 'Create listing'}
        </Button>
        <Button type="button" variant="secondary" onClick={onSaveDraft}>
          Save draft on device
        </Button>
        {status === 'pending' && (
          <Button type="button" variant="secondary" onClick={onSync} disabled={busy}>
            Sync saved draft
          </Button>
        )}
        {status !== 'idle' && (
          <Button type="button" variant="ghost" onClick={clearDraft}>
            Clear device draft
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

function SyncBadge({ status }: { status: 'idle' | 'local' | 'pending' | 'synced' | 'failed' }) {
  const map = {
    idle: { tone: 'neutral' as const, label: 'No local draft' },
    local: { tone: 'info' as const, label: 'Saved locally' },
    pending: { tone: 'warning' as const, label: 'Pending synchronization' },
    synced: { tone: 'success' as const, label: 'Synced' },
    failed: { tone: 'danger' as const, label: 'Sync failed — retry available' }
  };
  const s = map[status];
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

function validate(values: ListingFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.title.trim() || values.title.trim().length < 4) errors.title = 'Add a title of at least 4 characters.';
  if (!values.description.trim() || values.description.trim().length < 20) errors.description = 'Add a description of at least 20 characters.';
  const price = Number(values.unitPriceEtb);
  if (!Number.isFinite(price) || price <= 0) errors.unitPriceEtb = 'Enter a positive price.';
  else if (!/^\d{1,9}(\.\d{1,2})?$/.test(values.unitPriceEtb.trim())) errors.unitPriceEtb = 'Use up to two decimals.';
  const qty = Number(values.availableQuantity);
  if (!Number.isInteger(qty) || qty < 0) errors.availableQuantity = 'Whole number, zero or greater.';
  const min = Number(values.minOrderQuantity);
  if (!Number.isInteger(min) || min < 1) errors.minOrderQuantity = 'Minimum 1.';
  if (Number.isInteger(qty) && Number.isInteger(min) && qty > 0 && min > qty && values.availability !== 'made_to_order') {
    errors.minOrderQuantity = 'Minimum exceeds available quantity.';
  }
  return errors;
}
