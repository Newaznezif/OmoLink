'use client';

import type { Category, Profile } from '@/lib/types';
import { Field, Input, Textarea, Select, Button } from './ui';

export function RegisterForm({ categories }: { categories: Category[] }) {
  return (
    <div className="space-y-4">
      <Field label="Display name or group name" htmlFor="displayName" required>
        <Input id="displayName" name="displayName" required maxLength={120} />
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
            <option value="other">Other</option>
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
          I consent to publishing this profile information on OmoLink. Sensitive cultural knowledge, community
          imagery, or ceremony details are <strong>not</strong> commercialised by default.
        </span>
      </label>
      <Button type="submit">Create demo profile</Button>
      <p className="text-xs text-ink-500">
        <ProfileDisclaimer />
      </p>
    </div>
  );
}

function ProfileDisclaimer() {
  return (
    <span>
      This build does not connect to Supabase Auth yet. The account you create is stored only in an in-memory demo
      store that resets when the server cold-restarts. Do not enter real private data.
    </span>
  );
}
