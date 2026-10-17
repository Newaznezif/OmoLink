import { handleAdminForm, required } from '@/lib/admin-actions';

export const dynamic = 'force-dynamic';

/** Contact messages are marked handled. Replies still go out through the human
 *  channel the administrator chose; nothing here sends an email automatically. */
export async function POST(req: Request) {
  return handleAdminForm(req, async ({ form, actor, repo }) => {
    const id = required(form, 'messageId', 'The message');
    const status = String(form.get('status') ?? '');
    if (status !== 'new' && status !== 'handled') throw new Error('Unknown message status.');

    const updated = await repo.setContactMessageStatus(id, status as 'new' | 'handled', actor);
    return updated.status === 'handled'
      ? `Marked “${updated.subject}” as handled. No reply was sent automatically — contact ${updated.email} yourself.`
      : `Reopened “${updated.subject}”.`;
  });
}
