import { isDemoMode } from '@/lib/store';
import type { Actor } from '@/lib/session';

/**
 * Tells the person what kind of session they are in, and blocks nothing by
 * itself — authorization lives in requireRole() and in the repository.
 */
export function AccountBanner({ actor }: { actor: Actor }) {
  return (
    <div className="space-y-3">
      {actor.status === 'suspended' && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <strong>This account is suspended.</strong> You can still read your own records, but you cannot publish,
          reply, contribute, or change listings until an administrator reactivates it. If you believe this is a
          mistake, use the <a href="/contact" className="underline font-semibold">contact page</a>.
        </div>
      )}
      {isDemoMode() && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          Demo mode: these are sample records, and anything you save here is reset when the server restarts.
        </p>
      )}
    </div>
  );
}
