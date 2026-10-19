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

/**
 * Demo sign-in accepts only user ids carrying this prefix. The pilot's real
 * sellers are seeded with `pilot_user_` ids so nobody can be signed into as a
 * real person, and the account picker on /sign-in hides those profiles with the
 * same rule — offering an account the endpoint would refuse is a dead button.
 */
export const DEMO_USER_ID_PREFIX = 'demo_user_';

export function canSignInAsDemo(userId: string): boolean {
  return userId.startsWith(DEMO_USER_ID_PREFIX);
}
