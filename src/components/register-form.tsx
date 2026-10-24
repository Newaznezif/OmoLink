'use client';

import type { Category, LanguageCode, Profile } from '@/lib/types';
import { t, type TranslationKey } from '@/lib/i18n';
import { Field, Input, Textarea, Select, Button } from './ui';

export function RegisterForm({
  categories,
  mode,
  lang
}: {
  categories: Category[];
  mode: 'demo' | 'supabase';
  lang: LanguageCode;
}) {
  const tr: (key: TranslationKey, vars?: Record<string, string | number>) => string = (key, vars) =>
    t(lang, key, vars);
  return (
    <div className="space-y-4">
      {mode === 'supabase' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label={tr('auth.email')} htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label={tr('auth.password')} htmlFor="password" required hint={tr('register.passwordHint')}>
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
          </Field>
        </div>
      )}
      <Field label={tr('register.displayNameLabel')} htmlFor="displayName" required>
        <Input id="displayName" name="displayName" required maxLength={120} />
      </Field>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900 mb-1">{tr('register.roleLegend')}</legend>
        <p className="text-xs text-ink-500 mb-2">
          {tr('register.roleHint')}
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { value: 'producer', label: tr('register.roleProducer') },
            { value: 'group_or_cooperative', label: tr('register.roleGroup') },
            { value: 'individual_buyer', label: tr('register.roleIndividual') },
            { value: 'business_buyer', label: tr('register.roleBusiness') },
            { value: 'tourist', label: tr('register.roleTourist') }
          ].map((option, index) => (
            <label
              key={option.value}
              className="flex gap-2 items-center text-sm rounded-lg border border-ink-100 px-3 py-2"
            >
              <input
                type="radio"
                name="accountKind"
                value={option.value}
                defaultChecked={index === 0}
                className="w-4 h-4"
                required
              />
              <span>{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label={tr('register.organizationLabel')} htmlFor="organizationName" hint={tr('register.organizationHint')}>
        <Input id="organizationName" name="organizationName" maxLength={120} />
      </Field>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label={tr('register.producerTypeLabel')} htmlFor="producerType" required>
          <Select id="producerType" name="producerType" defaultValue="artisan">
            <option value="artisan">{tr('register.producerTypeArtisan')}</option>
            <option value="farmer">{tr('register.producerTypeFarmer')}</option>
            <option value="producer_group">{tr('register.producerTypeGroup')}</option>
            <option value="cooperative">{tr('register.producerTypeCooperative')}</option>
            <option value="guide">{tr('register.producerTypeGuide')}</option>
            <option value="tourism_operator">{tr('register.producerTypeOperator')}</option>
            <option value="household">{tr('register.producerTypeHousehold')}</option>
            <option value="other">{tr('register.producerTypeOther')}</option>
          </Select>
        </Field>
        <Field label={tr('register.preferredLanguageLabel')} htmlFor="preferredLanguage" required>
          <Select id="preferredLanguage" name="preferredLanguage" defaultValue="en">
            <option value="en">{tr('register.langEnglish')}</option>
            <option value="am">{tr('register.langAmharic')}</option>
            <option value="hamer" disabled>
              {tr('register.langHamer')}
            </option>
            <option value="dag" disabled>
              {tr('register.langDasenech')}
            </option>
            <option value="tsamai" disabled>
              {tr('register.langTsamai')}
            </option>
          </Select>
        </Field>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label={tr('filter.community')} htmlFor="community" required hint={tr('register.communityHint')}>
          <Input id="community" name="community" required maxLength={120} />
        </Field>
        <Field label={tr('register.operatingAreaLabel')} htmlFor="operatingArea" required>
          <Input id="operatingArea" name="operatingArea" required maxLength={120} />
        </Field>
      </div>
      <Field label={tr('register.shortBioLabel')} htmlFor="shortBio" required>
        <Textarea id="shortBio" name="shortBio" required />
      </Field>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900 mb-1">{tr('register.categoriesLegend')}</legend>
        <div className="grid sm:grid-cols-2 gap-2">
          {categories.map((c) => (
            <label key={c.id} className="flex gap-2 items-center text-sm rounded-lg border border-ink-100 px-3 py-2">
              <input type="checkbox" name="categories" value={c.id} className="w-4 h-4" />
              <span>{c.name}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field
        label={tr('register.contactMethodLabel')}
        htmlFor="contactMethod"
        hint={tr('register.contactMethodHint')}
      >
        <Input id="contactMethod" value={tr('register.contactMethodValue')} readOnly />
      </Field>
      <label className="flex gap-2 items-start text-sm rounded-lg border border-ink-100 p-3">
        <input type="checkbox" name="consent" className="mt-1 w-4 h-4" required />
        <span>
          {tr('register.consentLead')}
          <strong>{tr('register.consentNot')}</strong>
          {tr('register.consentTail')}
        </span>
      </label>
      <Button type="submit">{mode === 'demo' ? tr('register.submitDemo') : tr('register.submitAccount')}</Button>
      <p className="text-xs text-ink-500">
        <ProfileDisclaimer mode={mode} lang={lang} />
      </p>
    </div>
  );
}

function ProfileDisclaimer({ mode, lang }: { mode: 'demo' | 'supabase'; lang: LanguageCode }) {
  if (mode === 'supabase') {
    return <span>{t(lang, 'register.disclaimerSupabase')}</span>;
  }
  return <span>{t(lang, 'register.disclaimerDemo')}</span>;
}
