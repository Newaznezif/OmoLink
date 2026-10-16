import { Card, CardBody, Section, Badge } from '@/components/ui';
import { DraftBrowser } from '@/components/draft-browser';

export default function OfflinePage() {
  return (
    <Section
      eyebrow="Offline and low connectivity"
      title="How OmoLink behaves when the network is unreliable"
      description="A practical design for intermittent internet and electricity in South Omo."
    >
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">App shell and public listings</h2>
            <p className="mt-1 text-sm text-ink-700">
              A service worker caches the app shell and pages you have already visited. Once you load a listing while
              online, you can revisit it later without a connection. API mutations are never cached.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone="info">Cache-first for visited GETs</Badge>
              <Badge tone="neutral">Network-only for /api</Badge>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Listing drafts on device</h2>
            <p className="mt-1 text-sm text-ink-700">
              When a producer fills out a listing while offline, the draft is stored in IndexedDB (with a
              localStorage fallback). Drafts survive page refresh and browser restart. The status badge shows: Saved
              locally, Pending synchronization, Synced, or Sync failed — and a retry is always available.
            </p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <h2 className="font-semibold text-ink-900">Retrying inquiries offline</h2>
            <p className="mt-1 text-sm text-ink-700">
              If a buyer submits an inquiry while offline, the payload is queued on their device with an idempotency
              key. When the connection returns, submitting again reuses the same key so duplicates are prevented. We
              do not pretend the platform has delivered anything the producer has not received.
            </p>
          </CardBody>
        </Card>
      </div>

      <div className="mt-6">
        <DraftBrowser />
      </div>

      <div className="mt-6 rounded-lg border border-ochre-100 bg-ochre-50 p-4 text-sm text-ochre-700">
        <h2 className="font-semibold">What this prototype does not do</h2>
        <ul className="mt-1 list-disc pl-5 space-y-1">
          <li>
            It does <strong>not</strong> send SMS or USSD. A web app cannot offer SMS just by adding a button — a real
            gateway and backend integration would be needed and tested before any claim is made.
          </li>
          <li>It does <strong>not</strong> process payments or represent that an inquiry has been paid for.</li>
          <li>It does <strong>not</strong> fabricate route distances, travel times or transport availability.</li>
        </ul>
      </div>
    </Section>
  );
}
