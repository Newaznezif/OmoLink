import { notFound } from 'next/navigation';
import { getRepo } from '@/lib/repo';
import { requireArea } from '@/lib/area';
import { isDemoMode } from '@/lib/store';
import { getLanguage, getT } from '@/lib/i18n/server';
import { formatMoney } from '@/lib/money';
import { Card, CardBody, Section } from '@/components/ui';
import { PaymentStatusBadge } from '@/components/payment-panel';
import { DemoCheckout } from '@/components/demo-checkout';

export const dynamic = 'force-dynamic';

/**
 * The demo-mode stand-in for a provider's hosted checkout page.
 *
 * It exists so the buyer → quote → pay → receipt path can be demonstrated and
 * tested end to end while `DATA_MODE=demo`. Outside demo mode this route 404s,
 * and the real flow never renders a page that lets a visitor declare their own
 * payment successful — a live checkout belongs to the provider, and the only
 * proof the app accepts is the server-side verification call.
 *
 * The buyer sees the amount, but it is read from the stored record here rather
 * than sent along with the choice they make, so nothing on this page can change
 * what is charged.
 */
export default async function DemoCheckoutPage({ params }: { params: { reference: string } }) {
  const actor = await requireArea(`/pay/demo/${params.reference}`, ['buyer']);
  if (!isDemoMode()) notFound();

  const tr = getT();
  const lang = getLanguage();
  const payment = await getRepo().getPayment(params.reference);
  // Another buyer's reference is not answered with "not yours" — it is simply not here.
  if (!payment || payment.buyerProfileId !== actor.profileId) notFound();

  return (
    <Section eyebrow={tr('demoCheckout.title')} title={tr('payment.heading')} description={tr('payment.simulatedNote')}>
      <Card className="max-w-2xl">
        <CardBody>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold text-ink-900">{tr('payment.referenceLine', { reference: payment.reference })}</h2>
            <PaymentStatusBadge lang={lang} status={payment.status} isDemo />
          </div>
          <dl className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-500">{tr('payment.amountLabel')}</dt>
              <dd className="text-ink-900">{formatMoney({ cents: payment.amountCents, currency: payment.currency })}</dd>
            </div>
            {payment.checkoutExpiresAt && (
              <div>
                <dt className="text-ink-500">{tr('payment.windowCloses')}</dt>
                <dd className="text-ink-900">{new Date(payment.checkoutExpiresAt).toLocaleString()}</dd>
              </div>
            )}
          </dl>

          <div className="mt-5 border-t border-ink-100 pt-4">
            <DemoCheckout lang={lang} reference={payment.reference} inquiryId={payment.inquiryId} status={payment.status} />
          </div>
        </CardBody>
      </Card>
    </Section>
  );
}
