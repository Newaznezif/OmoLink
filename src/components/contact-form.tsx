'use client';

import { useState } from 'react';
import type { LanguageCode } from '@/lib/types';
import { t } from '@/lib/i18n';
import { Button, Field, Input, Textarea } from './ui';

export function ContactForm({
  lang,
  prefillName,
  prefillEmail
}: {
  lang: LanguageCode;
  prefillName?: string;
  prefillEmail?: string;
}) {
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage(null);
    const form = new FormData(event.currentTarget);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          subject: form.get('subject'),
          message: form.get('message')
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error ?? t(lang, 'contact.formFailed'));
      setStatus('sent');
      setMessage(t(lang, 'contact.formSent'));
      (event.currentTarget as HTMLFormElement).reset();
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : t(lang, 'contact.formNetwork'));
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="rounded-lg border border-moss-100 bg-moss-50 p-4 text-sm text-moss-800">
        {message}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Field label={t(lang, 'contact.formName')} htmlFor="name" required>
          <Input id="name" name="name" required maxLength={120} defaultValue={prefillName} autoComplete="name" />
        </Field>
        <Field label={t(lang, 'contact.formEmail')} htmlFor="email" required>
          <Input id="email" name="email" type="email" required maxLength={200} defaultValue={prefillEmail} autoComplete="email" />
        </Field>
      </div>
      <Field label={t(lang, 'contact.formSubject')} htmlFor="subject" hint={t(lang, 'contact.formSubjectHint')}>
        <Input id="subject" name="subject" maxLength={120} defaultValue={t(lang, 'contact.formSubjectDefault')} />
      </Field>
      <Field label={t(lang, 'contact.formMessage')} htmlFor="message" required hint={t(lang, 'contact.formMessageHint')}>
        <Textarea id="message" name="message" required minLength={10} maxLength={2000} />
      </Field>
      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? t(lang, 'contact.formSending') : t(lang, 'contact.formSubmit')}
      </Button>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
