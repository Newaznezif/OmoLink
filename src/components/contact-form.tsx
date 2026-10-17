'use client';

import { useState } from 'react';
import { Button, Field, Input, Textarea } from './ui';

export function ContactForm({ prefillName, prefillEmail }: { prefillName?: string; prefillEmail?: string }) {
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
      if (!res.ok) throw new Error(json?.error ?? 'The message could not be sent.');
      setStatus('sent');
      setMessage('Thank you. Your message is recorded for an administrator to read. It is not an order or a booking.');
      (event.currentTarget as HTMLFormElement).reset();
    } catch (err: unknown) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Network problem — the message stayed on your device.');
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
        <Field label="Your name" htmlFor="name" required>
          <Input id="name" name="name" required maxLength={120} defaultValue={prefillName} autoComplete="name" />
        </Field>
        <Field label="Email we can reply to" htmlFor="email" required>
          <Input id="email" name="email" type="email" required maxLength={200} defaultValue={prefillEmail} autoComplete="email" />
        </Field>
      </div>
      <Field label="Subject" htmlFor="subject" hint="For example: a product question, a booking, or a reporting concern.">
        <Input id="subject" name="subject" maxLength={120} defaultValue="General enquiry" />
      </Field>
      <Field label="Message" htmlFor="message" required hint="At least 10 characters. Please do not send ID documents or payment details.">
        <Textarea id="message" name="message" required minLength={10} maxLength={2000} />
      </Field>
      <Button type="submit" disabled={status === 'sending'}>
        {status === 'sending' ? 'Sending…' : 'Send message'}
      </Button>
      {status === 'error' && (
        <p role="alert" className="text-sm text-red-700">
          {message}
        </p>
      )}
    </form>
  );
}
