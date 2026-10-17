import { Section } from './ui';

type SearchParams = { status?: string | string[]; error?: string | string[] };

/** Server actions come back here with the outcome, so the result is never guessed. */
export function AdminFeedback({ searchParams }: { searchParams: SearchParams }) {
  const status = typeof searchParams.status === 'string' ? searchParams.status : undefined;
  const error = typeof searchParams.error === 'string' ? searchParams.error : undefined;
  if (!status && !error) return null;
  return (
    <div className="space-y-2">
      {status && (
        <p role="status" className="rounded-lg border border-moss-100 bg-moss-50 px-4 py-3 text-sm text-moss-700">
          {status}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * The confirmation tick is checked on the server as well as asked for here, so
 * posting the form without it is refused rather than quietly accepted.
 */
export function ConfirmField({ label, id }: { label: string; id: string }) {
  return (
    <div className="mt-3">
      <label htmlFor={id} className="flex items-start gap-2 text-sm text-ink-700">
        <input id={id} name="confirm" type="checkbox" value="on" className="mt-1 h-4 w-4" required />
        <span>{label}</span>
      </label>
    </div>
  );
}

export function AdminSection({
  title,
  eyebrow = 'Administration',
  description,
  searchParams,
  children
}: {
  title: string;
  eyebrow?: string;
  description?: string;
  searchParams?: SearchParams;
  children: React.ReactNode;
}) {
  return (
    <Section eyebrow={eyebrow} title={title} description={description}>
      {searchParams && <AdminFeedback searchParams={searchParams} />}
      <div className={searchParams ? 'mt-4 space-y-6' : 'space-y-6'}>{children}</div>
    </Section>
  );
}

/** Hidden field that returns the administrator to the page they acted from. */
export function BackField({ path }: { path: string }) {
  return <input type="hidden" name="back" value={path} />;
}
