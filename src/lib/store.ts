import { buildSeed, type DB } from './demo-data';

/**
 * In-memory demo store. Global across hot reloads so the browser sees a stable
 * dataset during a session. Mutations do not survive a server cold-restart —
 * this is a documented limitation of demo mode.
 *
 * When DATA_MODE=supabase the repository routes through Supabase instead and
 * this store is never touched.
 */

declare global {
  // eslint-disable-next-line no-var
  var __omolinkDemoStore: DB | undefined;
}

export function getDemoStore(): DB {
  if (!globalThis.__omolinkDemoStore) {
    globalThis.__omolinkDemoStore = buildSeed();
  }
  return globalThis.__omolinkDemoStore;
}

export function resetDemoStore(): DB {
  globalThis.__omolinkDemoStore = buildSeed();
  return globalThis.__omolinkDemoStore;
}

export function isDemoMode(): boolean {
  const mode = process.env.DATA_MODE ?? 'demo';
  if (mode === 'demo') return true;
  if (mode === 'supabase') return false;
  throw new Error(`Invalid DATA_MODE "${mode}". Use "demo" or "supabase".`);
}
