'use client';

import type { Category, Profile } from '@/lib/types';
import { Field, Input, Textarea, Select, Button } from './ui';

export function RegisterForm({ categories, mode }: { categories: Category[]; mode: 'demo' | 'supabase' }) {
  return (
    <div className="space-y-4">
      {mode === 'supabase' && (
        <div className="grid md:grid-cols-2 gap-4">
          <Field label="Email" htmlFor="email" required>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </Field>
          <Field label="Password" htmlFor="password" required hint="At least 6 characters.">
            <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={6} />
          </Field>
        </div>
      )}
      <Field label="Display name or group name" htmlFor="displayName" required>
        <Input id="displayName" name="displayName" required maxLength={120} />
      </Field>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900 mb-1">What do you want to do on OmoNETAB?</legend>
        <p className="text-xs text-ink-500 mb-2">
          This chooses the shape of your account. It does not give you administrative rights — an administrator has to
          assign those separately.
        </p>
        <div className="grid sm:grid-cols-2 gap-2">
          {[
            { value: 'producer', label: 'Sell my products or services' },
            { value: 'group_or_cooperative', label: 'Represent a group or cooperative' },
            { value: 'individual_buyer', label: 'Buy as an individual' },
            { value: 'business_buyer', label: 'Buy for a business (shop, hotel, institution)' },
            { value: 'tourist', label: 'Visit the area and book experiences' }
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
      <Field
        label="Organisation name"
        htmlFor="organizationName"
        hint="Only for a business buyer or a registered group. Leave empty otherwise."
      >
        <Input id="organizationName" name="organizationName" maxLength={120} />
      </Field>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Producer type" htmlFor="producerType" required>
          <Select id="producerType" name="producerType" defaultValue="artisan">
            <option value="artisan">Artisan</option>
            <option value="farmer">Smallholder farmer</option>
            <option value="producer_group">Producer group</option>
            <option value="cooperative">Cooperative</option>
            <option value="guide">Guide</option>
            <option value="tourism_operator">Tourism operator</option>
            <option value="household">Household</option>
            <option value="other">Other (buyers and visitors)</option>
          </Select>
        </Field>
        <Field label="Preferred language" htmlFor="preferredLanguage" required>
          <Select id="preferredLanguage" name="preferredLanguage" defaultValue="en">
            <option value="en">English</option>
            <option value="am">Amharic (partial — review pending)</option>
            <option value="hamer" disabled>
              Hamer (not available)
            </option>
            <option value="dag" disabled>
              Dasenech (not available)
            </option>
            <option value="tsamai" disabled>
              Tsamai (not available)
            </option>
          </Select>
        </Field>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Field label="Community" htmlFor="community" required hint="Text description only. No exact geo-data is stored.">
          <Input id="community" name="community" required maxLength={120} />
        </Field>
        <Field label="Operating area" htmlFor="operatingArea" required>
          <Input id="operatingArea" name="operatingArea" required maxLength={120} />
        </Field>
      </div>
      <Field label="Short profile description" htmlFor="shortBio" required>
        <Textarea id="shortBio" name="shortBio" required />
      </Field>
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900 mb-1">Product or service categories</legend>
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
        label="Contact method"
        htmlFor="contactMethod"
        hint="Basic accounts use in-app inquiries only. Do not collect private phone numbers or IDs for a demo profile."
      >
        <Input id="contactMethod" value="In-app inquiry" readOnly />
      </Field>
      <label className="flex gap-2 items-start text-sm rounded-lg border border-ink-100 p-3">
        <input type="checkbox" name="consent" className="mt-1 w-4 h-4" required />
        <span>
          I consent to publishing this profile information on OmoNETAB. Sensitive cultural knowledge, community
          imagery, or ceremony details are <strong>not</strong> commercialised by default.
        </span>
      </label>
      <Button type="submit">{mode === 'demo' ? 'Create demo profile' : 'Create account and profile'}</Button>
      <p className="text-xs text-ink-500">
        <ProfileDisclaimer mode={mode} />
      </p>
    </div>
  );
}

function ProfileDisclaimer({ mode }: { mode: 'demo' | 'supabase' }) {
  if (mode === 'supabase') {
    return (
      <span>
        This creates a real Supabase Auth account. If email confirmation is enabled on the project, confirm the link
        before the profile becomes visible. A new profile always starts as unverified.
      </span>
    );
  }
  return (
    <span>
      Demo mode stores this account in an in-memory store that resets when the server cold-restarts. Do not enter real
      private data. A new profile always starts as unverified.
    </span>
  );
}
