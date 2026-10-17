import { redirect } from 'next/navigation';
import { getRepo, type Repo } from './repo';
import { AuthorizationError, requireRole, type Actor } from './session';

/**
 * Shared entry point for every administrator form action.
 *
 * The role and the account status are re-read from the stored profile on each
 * request, so a hidden button is never the boundary: an edited form, a stale
 * session, or a suspended administrator all fail here. Each repository method
 * receives the signed-in actor and checks the same rules again before it writes.
 */
export async function handleAdminForm(
  req: Request,
  run: (input: { form: FormData; actor: Actor; repo: Repo }) => Promise<string>
): Promise<Response> {
  const form = await req.formData().catch(() => null);
  if (!form) return Response.json({ error: 'Expected a form submission.', status: 400 }, { status: 400 });

  let actor: Actor;
  try {
    actor = await requireRole('admin');
  } catch (err) {
    if (err instanceof AuthorizationError) return Response.json({ error: err.message }, { status: err.status });
    return Response.json({ error: 'Sign in as an administrator.', status: 401 }, { status: 401 });
  }

  const back = safeBack(form);
  let message: string;
  try {
    message = await run({ form, actor, repo: getRepo() });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'The action did not complete.';
    redirect(`${back}?error=${encodeURIComponent(reason)}`);
  }
  // redirect() throws, so it must stay outside the try block above.
  redirect(`${back}?status=${encodeURIComponent(message)}`);
}

/** Administrators return to the page they acted from — /admin/... only. */
export function safeBack(form: FormData): string {
  const raw = form.get('back');
  if (typeof raw !== 'string' || !raw.startsWith('/admin') || raw.startsWith('//')) return '/admin';
  return raw;
}

/** Reads a required field, or throws the message the administrator sees. */
export function required(form: FormData, name: string, label: string): string {
  const value = String(form.get(name) ?? '').trim();
  if (!value) throw new Error(`${label} is required.`);
  return value;
}

/** Role changes, suspensions and deletions must be ticked into existence. */
export function confirmed(form: FormData, what: string): void {
  if (form.get('confirm') !== 'on') throw new Error(`Confirm ${what} before it is saved.`);
}
