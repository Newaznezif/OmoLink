'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/money';
import type { LanguageCode } from '@/lib/types';
import { t, type TranslationKey } from '@/lib/i18n';
import { InquiryForm, type InquiryListingInfo } from './inquiry-form';

export type GroupOrderProduct = InquiryListingInfo & {
  sellerId: string;
  sellerName: string;
};

/**
 * The customer side of a group order. A collective opportunity records pooled
 * quantities against a category, so a buyer cannot add several sellers to one
 * basket — the backend has no such table. What it does support is an inquiry per
 * listing, which is what this panel submits: the chosen product, the seller's own
 * published unit price, and a quantity that is validated before it is sent.
 */
export function GroupOrderBuyer({
  lang,
  products,
  recordsPath
}: {
  lang: LanguageCode;
  products: GroupOrderProduct[];
  recordsPath?: string;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) => t(lang, key, vars);
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? '');
  const selected = products.find((p) => p.id === selectedId) ?? products[0];

  if (!selected) {
    return (
      <div className="rounded-xl border border-ink-100 bg-white p-4 text-sm text-ink-700 space-y-3">
        <p className="font-semibold text-ink-900">{tr('collective.buyEmptyTitle')}</p>
        <p>{tr('collective.buyEmptyBody')}</p>
        <a href="/products" className="inline-block font-semibold text-clay-800 underline">
          {tr('home.browseProducts')}
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ol className="grid sm:grid-cols-3 gap-3 text-sm text-ink-700">
        <li className="rounded-xl border border-ink-100 bg-white p-3">
          <span className="block font-bold text-clay-700">1</span>
          {tr('collective.buyStep1')}
        </li>
        <li className="rounded-xl border border-ink-100 bg-white p-3">
          <span className="block font-bold text-clay-700">2</span>
          {tr('collective.buyStep2')}
        </li>
        <li className="rounded-xl border border-ink-100 bg-white p-3">
          <span className="block font-bold text-clay-700">3</span>
          {tr('collective.buyStep3')}
        </li>
      </ol>

      <fieldset className="border-0 p-0 m-0">
        <legend className="text-sm font-semibold text-ink-900">{tr('collective.chooseProduct')}</legend>
        <ul className="mt-2 grid sm:grid-cols-2 gap-2">
          {products.map((product) => (
            <li key={product.id}>
              <label
                htmlFor={`group_order_${product.id}`}
                className={
                  'flex flex-col gap-1 rounded-xl border p-3 text-sm cursor-pointer ' +
                  (product.id === selected.id ? 'border-clay-400 bg-clay-50' : 'border-ink-100 bg-white hover:border-clay-300')
                }
              >
                <span className="flex items-start gap-2">
                  <input
                    id={`group_order_${product.id}`}
                    type="radio"
                    name="group_order_product"
                    value={product.id}
                    checked={product.id === selected.id}
                    onChange={() => setSelectedId(product.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="font-semibold text-ink-900">{product.title}</span>
                </span>
                <span className="pl-6 text-ink-700">
                  {tr('collective.sellerLabel')}: {product.sellerName}
                </span>
                <span className="pl-6 text-ink-700">
                  {tr('listing.unitPrice')}: {formatMoney({ cents: product.unitPriceCents, currency: 'ETB' })}
                  {tr('listing.unitSuffix', { unit: product.unitOfSale })}
                </span>
                <span className="pl-6 text-xs text-ink-500">
                  {tr('listing.minOrder', { count: product.minOrderQuantity, unit: product.unitOfSale })} ·{' '}
                  {tr('listing.availableQuantity')}: {product.availableQuantity}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </fieldset>

      <InquiryForm key={selected.id} lang={lang} listing={selected} recordsPath={recordsPath} />
    </div>
  );
}
