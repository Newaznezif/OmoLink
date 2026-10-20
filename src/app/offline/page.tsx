import { Card, CardBody, Section, Badge } from '@/components/ui';
import { DraftBrowser } from '@/components/draft-browser';

export default function OfflinePage() {
  return (
    <Section
      eyebrow="Offline and low connectivity"
      title="How OmoNetTab behaves when the network is unreliable"
      description="A practical design for intermittent internet and electricity in South Omo."
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">App shell and public listings</h2>
            <p className="mt-1 text-sm text-ink-700">
              Pages you have already opened are kept on your device, so a listing you loaded online can be revisited
              without a connection. Open the site once while online to start that cache. Nothing you send — an inquiry
              or a listing — is held back and submitted later without you knowing.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">Pages: shown offline once visited</Badge>
              <Badge tone="neutral">Sent to the producer: always online</Badge>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Listing drafts on device</h2>
            <p className="mt-1 text-sm text-ink-700">
              When a producer fills out a listing while offline, the draft is saved on that device. It survives a page
              refresh and a browser restart, and the status badge shows Saved locally, Pending synchronization, Synced,
              or Sync failed — a retry is always available. Publishing still needs a connection, because the server has
              to receive it: offline, the form says so and keeps the draft rather than sending a request that cannot
              arrive.
            </p>
            <p className="mt-2 text-sm text-ink-500">
              Nothing here reaches another person. The draft lives only on this device, and clearing the browser’s site
              data deletes it.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Retrying inquiries offline</h2>
            <p className="mt-1 text-sm text-ink-700">
              If a buyer submits an inquiry while offline, the payload is queued on their device under its own
              reference, one queue per listing so a second inquiry cannot overwrite the first. Reopening the page
              restores the saved contents and keeps that same reference, so submitting again after the connection
              returns is matched by the server instead of creating a duplicate. The queue clears once the producer’s
              record is actually written. We do not pretend the platform has delivered anything the producer has not
              received.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <DraftBrowser />
      </div>

      <div className="mt-6 rounded-lg border border-ochre-100 bg-ochre-50 p-4 text-sm text-ochre-700">
        <h2 className="font-semibold">What OmoNetTab does not do</h2>
        <ul className="mt-1 list-disc pl-5 space-y-1">
          <li>It does <strong>not</strong> send SMS or USSD messages.</li>
          <li>It does <strong>not</strong> process payments or represent that an inquiry has been paid for.</li>
          <li>It does <strong>not</strong> fabricate route distances, travel times or transport availability.</li>
        </ul>
      </div>
    </Section>
  );
}
