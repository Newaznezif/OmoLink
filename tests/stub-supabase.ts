/**
 * A minimal in-memory stand-in for the Supabase JS client, sufficient for the
 * query shapes src/lib/supabase/repository.ts issues.
 *
 * This is NOT a database. It proves which requests the repository builds and
 * which validations it enforces; it cannot prove that RLS policies or Postgres
 * constraints behave correctly. Those need a real project.
 */

export type Write = { table: string; method: string; payload: unknown };
export type Step = { table: string; method: string; args: unknown[] };

const WRITE_METHODS = ['insert', 'update', 'upsert', 'delete'];

export type Stub = {
  client: any;
  writes: Write[];
  steps: Step[];
};

export function stubSupabase(tables: Record<string, Record<string, unknown>[]>, options: { userId?: string | null } = {}): Stub {
  const writes: Write[] = [];
  const steps: Step[] = [];

  function makeChain(table: string, history: Step[]): any {
    const push = (method: string, ...args: unknown[]) => {
      const entry = { table, method, args };
      steps.push(entry);
      return makeChain(table, [...history, entry]);
    };

    const filterRows = () => {
      let rows = [...(tables[table] ?? [])];
      for (const step of history) {
        const [column, value] = step.args as [string, unknown];
        if (step.method === 'eq') rows = rows.filter((r) => r[column] === value);
        else if (step.method === 'neq') rows = rows.filter((r) => r[column] !== value);
        else if (step.method === 'in') rows = rows.filter((r) => (value as unknown[]).includes(r[column]));
        else if (step.method === 'limit') rows = rows.slice(0, value as number);
      }
      return rows;
    };

    const settle = (terminal: 'single' | 'maybeSingle' | 'many') => {
      const writeStep = [...history].reverse().find((s) => WRITE_METHODS.includes(s.method));
      if (writeStep) {
        writes.push({ table, method: writeStep.method, payload: writeStep.args[0] });
        const row = (tables[table] ?? [])[0] ?? null;
        if (terminal === 'many') return { data: row ? [row] : [], count: row ? 1 : 0, error: null };
        return { data: row, error: null };
      }
      const rows = filterRows();
      const headOnly = history.some((s) => s.method === 'select' && (s.args[1] as { head?: boolean } | undefined)?.head === true);
      if (headOnly) return { data: null, count: rows.length, error: null };
      if (terminal === 'single') {
        if (rows.length === 0) return { data: null, error: { code: 'PGRST116', message: 'no rows' } };
        return { data: rows[0], error: null };
      }
      if (terminal === 'maybeSingle') return { data: rows[0] ?? null, error: null };
      return { data: rows, count: rows.length, error: null };
    };

    const chain: any = {
      select: (columns: string, opts?: unknown) => push('select', columns, opts),
      eq: (column: string, value: unknown) => push('eq', column, value),
      neq: (column: string, value: unknown) => push('neq', column, value),
      in: (column: string, values: unknown[]) => push('in', column, values),
      or: (filter: string) => push('or', filter),
      order: (column: string, opts?: unknown) => push('order', column, opts),
      limit: (count: number) => push('limit', count),
      insert: (payload: unknown) => push('insert', payload),
      update: (payload: unknown) => push('update', payload),
      upsert: (payload: unknown, opts?: unknown) => push('upsert', payload, opts),
      delete: () => push('delete'),
      single: () => Promise.resolve(settle('single')),
      maybeSingle: () => Promise.resolve(settle('maybeSingle'))
    };

    chain.then = (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(settle('many')).then(onFulfilled, onRejected);

    return chain;
  }

  return {
    writes,
    steps,
    client: {
      from: (table: string) => makeChain(table, []),
      auth: {
        getUser: async () => ({ data: { user: options.userId === null ? null : { id: options.userId ?? 'user-1' } } })
      }
    }
  };
}
