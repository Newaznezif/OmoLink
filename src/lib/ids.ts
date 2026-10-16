/** Deterministic id for reproducible demo data. Random ids for new records. */
export function makeId(prefix: string): string {
  const rand =
    typeof globalThis.crypto?.randomUUID === 'function'
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${rand}`;
}

/** Human-friendly inquiry reference like OL-2026-4F3A */
export function makeReference(): string {
  const year = new Date().getFullYear();
  const suffix = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `OL-${year}-${suffix}`;
}
