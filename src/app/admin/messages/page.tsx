import { getRepo } from '@/lib/repo';
import { AdminSection, BackField } from '@/components/admin-shell';
import { Badge, Button, Card, CardBody, Empty, Input, Select } from '@/components/ui';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function AdminMessagesPage({ searchParams }: { searchParams: SearchParams }) {
  const text = (key: string): string => (typeof searchParams[key] === 'string' ? (searchParams[key] as string) : '');
  const messages = await getRepo().listContactMessages();
  const q = text('q').trim().toLowerCase();
  const status = text('status');

  const rows = messages
    .filter((m) => {
      if (status && m.status !== status) return false;
      if (!q) return true;
      return [m.name, m.email, m.subject, m.message].join(' ').toLowerCase().includes(q);
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const unread = messages.filter((m) => m.status === 'new').length;

  return (
    <AdminSection
      title="Contact messages"
      description={`${unread} of ${messages.length} ${messages.length === 1 ? 'message is' : 'messages are'} awaiting a reply. Marking one handled is a bookkeeping step for the team: nothing sends an email or SMS, so the reply itself has to go out through the channel the visitor used. Addresses here are private contact details — use them only to answer the message.`}
      searchParams={searchParams}
    >
      <Card>
        <CardBody>
          <form method="get" className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label htmlFor="q" className="block text-sm font-semibold text-ink-900 mb-1">
                Search name, email or subject
              </label>
              <Input id="q" name="q" defaultValue={text('q')} />
            </div>
            <div>
              <label htmlFor="status" className="block text-sm font-semibold text-ink-900 mb-1">
                Status
              </label>
              <Select id="status" name="status" defaultValue={status}>
                <option value="">All</option>
                <option value="new">Awaiting reply</option>
                <option value="handled">Handled</option>
              </Select>
            </div>
            <div className="flex items-end">
              <Button type="submit" size="sm">
                Apply
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {rows.length === 0 ? (
        <Empty
          title="No message matches"
          body="Messages submitted through the contact page land here. If the mailbox is empty, nothing has been sent yet — the inbox is not pre-filled with sample traffic."
        />
      ) : (
        <div className="space-y-3">
          {rows.map((m) => (
            <Card key={m.id}>
              <CardBody className="flex flex-col lg:flex-row lg:items-start gap-4">
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink-900">{m.subject}</h3>
                    <Badge tone={m.status === 'new' ? 'warning' : 'success'}>
                      {m.status === 'new' ? 'awaiting reply' : 'handled'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-ink-500">
                    {m.name} · {m.email} · {new Date(m.createdAt).toLocaleString()}
                  </p>
                  <p className="mt-2 text-sm text-ink-700 whitespace-pre-line rounded-lg bg-clay-50 p-3">{m.message}</p>
                  <p className="mt-2 text-sm">
                    <a href={`mailto:${m.email}?subject=Re: ${encodeURIComponent(m.subject)}`} className="underline font-semibold text-clay-700">
                      Reply in your email client
                    </a>
                  </p>
                </div>

                <form method="post" action="/api/admin/messages" className="lg:w-64 shrink-0 space-y-2">
                  <BackField path="/admin/messages" />
                  <input type="hidden" name="messageId" value={m.id} />
                  <div className="flex flex-wrap gap-2">
                    {m.status === 'new' ? (
                      <Button type="submit" name="status" value="handled" size="sm">
                        Mark handled
                      </Button>
                    ) : (
                      <Button type="submit" name="status" value="new" size="sm" variant="secondary">
                        Reopen
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-ink-500">No automatic reply is sent, so remember to answer the person.</p>
                </form>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardBody>
          <h2 className="font-semibold text-ink-900">Where messages come from</h2>
          <p className="mt-2 text-sm text-ink-700">
            The public contact form posts to <code>/api/contact</code>, which stores the message here. It does not claim
            delivery to an inbox. Configure a real mailbox or an SMTP relay only in the deployment environment — see the
            README for the variables involved, and never commit their values.
          </p>
        </CardBody>
      </Card>
    </AdminSection>
  );
}
