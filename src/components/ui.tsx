import clsx from 'clsx';
import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { VerificationStatus } from '@/lib/types';

type ButtonBase = {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children: ReactNode;
};

const buttonBase =
  'inline-flex items-center justify-center gap-2 font-semibold rounded-lg transition-colors border select-none disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-3';

const variantCls: Record<NonNullable<ButtonBase['variant']>, string> = {
  // "primary" follows the administrator's accent (see .accent-bg in globals.css)
  // instead of a build-time Tailwind shade, so the setting is genuinely applied.
  primary: 'accent-bg border-transparent',
  secondary: 'bg-white text-ink-900 border-ink-100 hover:bg-clay-50',
  ghost: 'bg-transparent text-ink-900 border-transparent hover:bg-clay-50',
  danger: 'bg-red-700 text-white border-red-700 hover:bg-red-800'
};

const sizeCls: Record<NonNullable<ButtonBase['size']>, string> = {
  sm: 'text-sm px-3 py-1.5 min-h-9',
  md: 'text-base px-4 py-2.5 min-h-11',
  lg: 'text-lg px-5 py-3 min-h-12'
};

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...rest
}: ButtonBase & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={clsx(buttonBase, variantCls[variant], sizeCls[size], className)}
      {...rest}
    >
      {children}
    </button>
  );
}

export function LinkButton({
  variant = 'primary',
  size = 'md',
  className,
  children,
  href,
  ...rest
}: ButtonBase & Omit<React.ComponentProps<typeof Link>, 'className'>) {
  return (
    <Link
      href={href}
      className={clsx(buttonBase, variantCls[variant], sizeCls[size], className)}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={clsx('bg-white border border-ink-100 rounded-2xl card-shadow overflow-hidden', className)}>
      {children}
    </div>
  );
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={clsx('p-5', className)}>{children}</div>;
}

export function Badge({
  tone = 'neutral',
  children,
  className,
  title
}: {
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info';
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  const tones = {
    neutral: 'bg-ink-50 text-ink-700 border-ink-100',
    success: 'bg-moss-50 text-moss-700 border-moss-100',
    warning: 'bg-ochre-50 text-ochre-700 border-ochre-100',
    danger: 'bg-red-50 text-red-700 border-red-100',
    info: 'bg-clay-50 text-clay-700 border-clay-100'
  } as const;
  return (
    <span
      title={title}
      className={clsx(
        'inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-full border',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

export function Section({
  title,
  eyebrow,
  description,
  actions,
  children,
  id,
  className
}: {
  title?: string;
  eyebrow?: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <section id={id} className={clsx('py-10 md:py-14', className)}>
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        {(title || eyebrow || description) && (
          <header className="mb-6">
            {eyebrow && <p className="text-sm uppercase tracking-wide text-clay-700 font-semibold mb-1">{eyebrow}</p>}
            {title && <h2 className="text-2xl md:text-3xl font-bold text-ink-900">{title}</h2>}
            {description && <p className="mt-2 max-w-3xl text-ink-700">{description}</p>}
            {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
          </header>
        )}
        {children}
      </div>
    </section>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-ink-100 rounded-2xl p-8 text-center bg-clay-50/40">
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mt-1 text-ink-700 max-w-md mx-auto">{body}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function ErrorState({ title, body, retryHref }: { title: string; body: string; retryHref?: string }) {
  return (
    <div role="alert" className="border border-red-100 bg-red-50 text-red-900 rounded-2xl p-6">
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm">{body}</p>
      {retryHref && (
        <Link href={retryHref} className="mt-3 inline-block underline font-semibold">
          Retry
        </Link>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx('animate-pulse bg-ink-100 rounded-lg', className)} aria-hidden="true" />;
}

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  required
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-sm font-semibold text-ink-900 mb-1">
        {label} {required && <span className="text-red-700">*</span>}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-ink-500">{hint}</p>}
      {error && (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

export function Input({
  invalid,
  className,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      aria-invalid={invalid ? 'true' : undefined}
      className={clsx(
        'w-full rounded-lg border bg-white px-3 py-2.5 min-h-11 text-base text-ink-900',
        invalid ? 'border-red-400' : 'border-ink-100',
        className
      )}
      {...rest}
    />
  );
}

export function Textarea({
  invalid,
  className,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      aria-invalid={invalid ? 'true' : undefined}
      className={clsx(
        'w-full rounded-lg border bg-white px-3 py-2.5 text-base text-ink-900 min-h-[110px]',
        invalid ? 'border-red-400' : 'border-ink-100',
        className
      )}
      {...rest}
    />
  );
}

export function Select({
  invalid,
  className,
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      aria-invalid={invalid ? 'true' : undefined}
      className={clsx(
        'w-full rounded-lg border bg-white px-3 py-2.5 min-h-11 text-base text-ink-900',
        invalid ? 'border-red-400' : 'border-ink-100',
        className
      )}
      {...rest}
    >
      {children}
    </select>
  );
}
