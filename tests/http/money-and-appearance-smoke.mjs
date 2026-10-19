// Money, documents and appearance verification suite (demo mode, mutating).
//   npm run build && npm run start
//   SMOKE_BASE=http://localhost:3000 node tests/http/money-and-appearance-smoke.mjs
//
// This is the HTTP half of the payment, receipt, report and theme work: what the
// unit tests cannot prove, which is that a refusal reaches the browser as a
// refusal, that a document is really a PDF, and that the colour scheme is decided
// in the first bytes of the page rather than by a script.
//
// Every payment here is the labelled simulator. Nothing in this file touches a
// real provider: DATA_MODE=demo resolves the simulator and the webhook route
// answers 404, so a suite that ran against live credentials could not be run by
// accident.
const BASE = process.env.SMOKE_BASE ?? 'http://localhost:3000';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  — ${detail}` : ''}`);
}

/** One browser: cookies are kept per jar, so two jars prove two devices. */
function makeJar(label) {
  const store = new Map();
  return {
    label,
    absorb(res) {
      for (const line of res.headers.getSetCookie?.() ?? []) {
        const pair = line.split(';')[0];
        const eq = pair.indexOf('=');
        if (eq > 0) store.set(pair.slice(0, eq).trim(), pair.slice(eq + 1).trim());
      }
    },
    header: () => (store.size ? [...store].map(([k, v]) => `${k}=${v}`).join('; ') : undefined),
    value: (name) => store.get(name),
    put: (name, value) => store.set(name, value),
    drop: (name) => store.delete(name)
  };
}

async function request(jar, method, path, body, headers) {
  const init = {
    method,
    redirect: 'manual',
    headers: { ...(jar.header() ? { cookie: jar.header() } : {}), ...(headers ?? {}) }
  };
  if (body !== undefined) {
    init.headers['content-type'] = 'application/json';
    init.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE}${path}`, init);
  jar.absorb(res);
  return res;
}

async function page(jar, path) {
  const res = await request(jar, 'GET', path);
  const text = res.status < 400 ? await res.text() : '';
  return {
    status: res.status,
    location: res.headers.get('location') ?? '',
    body: text,
    type: res.headers.get('content-type') ?? '',
    disposition: res.headers.get('content-disposition') ?? '',
    cache: res.headers.get('cache-control') ?? ''
  };
}

async function json(jar, method, path, body) {
  const res = await request(jar, method, path, body);
  return { status: res.status, json: await res.json().catch(() => ({})) };
}

// Only rendered text is scanned; the RSC payload legitimately repeats data.
function visible(html) {
  return html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
}

function htmlClass(html) {
  return /<html[^>]*class="([^"]*)"/.exec(html)?.[1] ?? '';
}

async function signIn(userId) {
  const jar = makeJar(userId);
  const res = await json(jar, 'POST', '/api/session', { userId });
  if (res.status !== 200) throw new Error(`sign-in ${userId} -> ${res.status}`);
  return { jar, profile: res.json };
}

const buyer = await signIn('demo_user_tourist');
const stranger = await signIn('demo_user_hotel');
const seller = await signIn('demo_user_basket');
const admin = await signIn('demo_user_admin');
check(
  'the four demo accounts sign in with the roles this suite assumes',
  buyer.profile.profile.role === 'buyer' &&
    stranger.profile.profile.role === 'buyer' &&
    seller.profile.profile.role === 'producer' &&
    admin.profile.profile.role === 'admin',
  [buyer.profile.profile.role, stranger.profile.profile.role, seller.profile.profile.role, admin.profile.profile.role].join('/')
);

// ---------- 1. an arrangement has to be answered before it can be paid ----------
const made = await json(buyer.jar, 'POST', '/api/inquiries', {
  listingId: 'lst_basket_set',
  buyerName: 'Smoke buyer',
  buyerContact: 'smoke-money@example.test',
  quantity: 2,
  preference: 'pickup',
  message: 'Smoke test inquiry that goes on to a simulated payment.'
});
const inquiry = made.json.inquiry ?? {};
check('a buyer sends an inquiry about a priced listing', made.status === 201 && Boolean(inquiry.id), `status=${made.status}`);
check(
  'the inquiry carries the estimate the payment will later copy',
  Number.isInteger(inquiry.estimatedSubtotalCents) && inquiry.estimatedSubtotalCents > 0,
  `cents=${inquiry.estimatedSubtotalCents}`
);

const tooEarly = await json(buyer.jar, 'POST', `/api/inquiries/${inquiry.id}/payments`, {});
check(
  'an unanswered inquiry is refused a payment, with the reason',
  tooEarly.status === 400 && /has not answered/i.test(tooEarly.json.error ?? ''),
  `status=${tooEarly.status} error=${tooEarly.json.error}`
);

const accepted = await json(seller.jar, 'PATCH', `/api/inquiries/${inquiry.id}`, { status: 'accepted' });
check('the producer accepts the inquiry', accepted.status === 200, `status=${accepted.status}`);

const notYours = await json(stranger.jar, 'POST', `/api/inquiries/${inquiry.id}/payments`, {});
check(
  'a different buyer cannot open a payment on someone else’s inquiry',
  notYours.status === 400 && /another buyer/i.test(notYours.json.error ?? ''),
  `status=${notYours.status} error=${notYours.json.error}`
);

const anonymous = makeJar('anonymous');
const signedOutAttempt = await json(anonymous, 'POST', `/api/inquiries/${inquiry.id}/payments`, {});
check(
  'a visitor with no session is told to sign in, not silently attributed',
  signedOutAttempt.status === 401 || signedOutAttempt.status === 403,
  `status=${signedOutAttempt.status}`
);

// ---------- 2. the attempt is priced by the record, not by the request ----------
const opened = await json(buyer.jar, 'POST', `/api/inquiries/${inquiry.id}/payments`, {
  amountCents: 1,
  currency: 'USD',
  status: 'confirmed',
  demoOutcome: 'success'
});
check('the buyer opens a payment attempt', opened.status === 201 && Boolean(opened.json.reference), `status=${opened.status}`);
check(
  'the amount comes from the stored inquiry, so the request cannot set it',
  opened.json.amountCents === inquiry.estimatedSubtotalCents,
  `asked=1 got=${opened.json.amountCents}`
);
check(
  'an attempt is pending until something verifies it, whatever the request claimed',
  opened.json.status === 'pending',
  `status=${opened.json.status}`
);
check(
  'the response says plainly that this is the simulator',
  opened.json.simulated === true,
  `simulated=${opened.json.simulated}`
);
const reference = opened.json.reference ?? 'none';

const checkout = await page(buyer.jar, `/pay/demo/${reference}`);
check(
  'the simulated checkout page renders and labels itself',
  checkout.status === 200 && /simulat/i.test(visible(checkout.body)),
  `status=${checkout.status}`
);
const foreignCheckout = await page(stranger.jar, `/pay/demo/${reference}`);
check(
  'another signed-in account is not shown someone else’s checkout page',
  foreignCheckout.status === 404 || foreignCheckout.status === 403 || /access-denied/.test(foreignCheckout.location),
  `status=${foreignCheckout.status} -> ${foreignCheckout.location}`
);

const badOutcome = await json(buyer.jar, 'POST', `/api/payments/${reference}/demo-outcome`, { outcome: 'approved_by_me' });
check(
  'the simulated checkout only accepts the scenarios it offers',
  badOutcome.status === 400,
  `status=${badOutcome.status} error=${badOutcome.json.error}`
);

const paid = await json(buyer.jar, 'POST', `/api/payments/${reference}/demo-outcome`, { outcome: 'success' });
check('finishing the simulated checkout confirms the attempt', paid.status === 200 && paid.json.status === 'confirmed', `status=${paid.status} ${paid.json.status}`);

const twice = await json(buyer.jar, 'POST', `/api/payments/${reference}/demo-outcome`, { outcome: 'failed' });
check(
  'a settled attempt cannot be re-decided, so no one can un-pay themselves',
  twice.status === 409,
  `status=${twice.status} error=${twice.json.error}`
);

const verify = await json(buyer.jar, 'POST', `/api/payments/${reference}/verify`, {});
check('the buyer can re-check the status through the provider path', verify.status === 200 && verify.json.status === 'confirmed', `status=${verify.status}`);
const foreignVerify = await json(stranger.jar, 'POST', `/api/payments/${reference}/verify`, {});
check(
  'a stranger cannot check someone else’s attempt',
  foreignVerify.status === 403 || foreignVerify.status === 404,
  `status=${foreignVerify.status}`
);

const webhookUnsigned = await request(anonymous, 'POST', '/api/payments/webhook', { event: 'payment', data: { id: reference } });
check(
  'demo mode has no external provider to notify, so the webhook is not there at all',
  webhookUnsigned.status === 404,
  `status=${webhookUnsigned.status}`
);

// ---------- 3. the receipt is a document, and an authorised one ----------
const receipt = await page(buyer.jar, `/api/payments/${reference}/receipt`);
const receiptBytes = Buffer.from(await (await request(buyer.jar, 'GET', `/api/payments/${reference}/receipt`)).arrayBuffer());
check('the payer downloads a receipt', receiptBytes.length > 800 && receipt.status === 200, `status=${receipt.status} bytes=${receiptBytes.length}`);
check('the receipt is served as a PDF, not as HTML', receiptBytes.subarray(0, 5).toString('latin1') === '%PDF-', `magic=${receiptBytes.subarray(0, 5).toString('latin1')}`);
check('the receipt asks for a download with a file name', /^attachment; filename="/.test(receipt.disposition), receipt.disposition);
check(
  'a document about someone’s money is never cached',
  /no-store/.test(receipt.cache),
  `cache-control=${receipt.cache}`
);

const receiptStranger = await page(stranger.jar, `/api/payments/${reference}/receipt`);
check('another buyer is refused the receipt', receiptStranger.status === 403, `status=${receiptStranger.status}`);

const receiptSeller = await page(seller.jar, `/api/payments/${reference}/receipt`);
const sellerBody = await (await request(seller.jar, 'GET', `/api/payments/${reference}/receipt`)).json().catch(() => ({}));
check(
  'the seller is refused the payer’s receipt and pointed at the inquiry record',
  receiptSeller.status === 403 && /inquiry record/i.test(sellerBody.error ?? ''),
  `status=${receiptSeller.status} error=${sellerBody.error}`
);

const receiptAdmin = await request(admin.jar, 'GET', `/api/payments/${reference}/receipt`);
check('an administrator can produce the receipt', receiptAdmin.status === 200, `status=${receiptAdmin.status}`);

const receiptAnon = await page(anonymous, `/api/payments/${reference}/receipt`);
check('a visitor is refused the receipt', receiptAnon.status === 401 || receiptAnon.status === 403 || receiptAnon.status === 302, `status=${receiptAnon.status}`);

const receiptUnknown = await page(buyer.jar, '/api/payments/PAY-NO-SUCH-RECORD/receipt');
check('an invented reference is a 404, not an empty document', receiptUnknown.status === 404, `status=${receiptUnknown.status}`);

const inquiryDocument = await request(seller.jar, 'GET', `/api/inquiries/${inquiry.id}/document`);
const inquiryDocBytes = Buffer.from(await inquiryDocument.arrayBuffer());
check(
  'the seller’s own route prints the arrangement record instead',
  inquiryDocument.status === 200 && inquiryDocBytes.subarray(0, 5).toString('latin1') === '%PDF-',
  `status=${inquiryDocument.status} bytes=${inquiryDocBytes.length}`
);
const strangerDocument = await request(stranger.jar, 'GET', `/api/inquiries/${inquiry.id}/document`);
check('a buyer who is not a party to the arrangement is refused that document', strangerDocument.status === 403 || strangerDocument.status === 404, `status=${strangerDocument.status}`);

// ---------- 4. the administrator’s report counts this confirmed attempt ----------
const reports = await page(admin.jar, '/admin/business-reports?range=day');
check('the report page renders for an administrator', reports.status === 200 && visible(reports.body).length > 2000, `status=${reports.status}`);
check('the report names the payment it just confirmed', visible(reports.body).includes(reference), reference);

const reportsAsSeller = await page(seller.jar, '/admin/business-reports?range=day');
check(
  'a producer is refused the whole-marketplace report',
  /access-denied/.test(reportsAsSeller.location) || reportsAsSeller.status === 403,
  `${reportsAsSeller.status} -> ${reportsAsSeller.location}`
);

const csvRes = await request(admin.jar, 'GET', '/api/admin/business-reports/export?range=day&format=csv');
const csvBytes = Buffer.from(await csvRes.arrayBuffer());
const csv = { status: csvRes.status, type: csvRes.headers.get('content-type') ?? '', body: csvBytes.toString('utf8') };
check('the report downloads as CSV', csv.status === 200 && /text\/csv/.test(csv.type), `status=${csv.status} type=${csv.type}`);
check(
  'the CSV starts with a UTF-8 BOM so spreadsheets read the names correctly',
  csvBytes[0] === 0xef && csvBytes[1] === 0xbb && csvBytes[2] === 0xbf,
  `first bytes=${csvBytes.subarray(0, 3).toString('hex')}`
);
check('the CSV row for this payment is there', csv.body.includes(reference), reference);
const csvLines = csv.body.slice(1).split(/\r?\n/);
check('the CSV has a header line and at least one data line', csvLines.length >= 2 && csvLines[0].includes(','), `lines=${csvLines.length}`);
check(
  'no cell is handed to the spreadsheet as a formula',
  !/(^|,)["']?[=@]/.test(csv.body) && !/(^|,)-\d/.test(csv.body),
  'an unguarded cell was found'
);

const pdfReport = await request(admin.jar, 'GET', '/api/admin/business-reports/export?range=day&format=pdf');
const pdfBytes = Buffer.from(await pdfReport.arrayBuffer());
check('the report also downloads as PDF', pdfReport.status === 200 && pdfBytes.subarray(0, 5).toString('latin1') === '%PDF-', `bytes=${pdfBytes.length}`);
check('an unknown export format is a refusal, not an empty file', (await page(admin.jar, '/api/admin/business-reports/export?range=day&format=xlsx')).status === 400);
const sellerExport = await page(seller.jar, '/api/admin/business-reports/export?range=day&format=csv');
check('a producer cannot export the report', sellerExport.status === 403 || sellerExport.status === 401, `status=${sellerExport.status}`);

// ---------- 5. the colour scheme is decided before the page reaches the browser ----------
const fresh = makeJar('fresh-device');
check('a device with no saved choice gets the light scheme', htmlClass((await page(fresh, '/')).body) === 'theme-light');

fresh.put('omonettab_theme', 'dark');
check('a saved dark choice is painted into the first bytes', htmlClass((await page(fresh, '/')).body) === 'theme-dark');

fresh.put('omonettab_theme', '"><script>alert(1)</script>');
const forgedPage = await page(fresh, '/');
const forgedClass = htmlClass(forgedPage.body);
check(
  'a forged cookie paints the default and injects nothing',
  forgedClass === 'theme-light' && !forgedPage.body.includes('<script>alert(1)</script>'),
  `class=${forgedClass}`
);

const savedTheme = await json(buyer.jar, 'PATCH', '/api/profile', { theme: 'dark' });
check('the account accepts a scheme from the list', savedTheme.status === 200 && savedTheme.json.profile?.theme === 'dark', `status=${savedTheme.status}`);
const forgedSave = await json(buyer.jar, 'PATCH', '/api/profile', { theme: 'blue' });
check('the account refuses a scheme that is not on the list', forgedSave.status === 400, `status=${forgedSave.status} error=${forgedSave.json.error}`);

const returning = makeJar('new-device-for-the-same-person');
await request(returning, 'POST', '/api/session', { userId: 'demo_user_tourist' });
check(
  'signing in on a new device hands it the saved scheme as a cookie',
  returning.value('omonettab_theme') === 'dark',
  `cookie=${String(returning.value('omonettab_theme'))}`
);
check('the first page that new device opens is already dark', htmlClass((await page(returning, '/')).body) === 'theme-dark');

const settings = await page(returning, '/buyer/settings');
const settingsText = visible(settings.body);
check(
  'the settings page offers exactly the two schemes',
  settings.status === 200 && /Theme appearance/.test(settingsText) && /Light/.test(settingsText) && /Dark/.test(settingsText),
  `status=${settings.status}`
);
const pressedAt = settings.body.indexOf('aria-pressed="true"');
check(
  'the saved scheme is the one marked as chosen',
  pressedAt >= 0 && /Dark/.test(settings.body.slice(pressedAt, pressedAt + 400)),
  `pressed marker at ${pressedAt}`
);

const signedOut = await request(returning, 'POST', '/api/session/signout', {});
check('signing out is accepted', signedOut.status < 400, `status=${signedOut.status}`);
check('the scheme stays after signing out on the same device', htmlClass((await page(returning, '/')).body) === 'theme-dark');

const untouched = makeJar('someone-elseentirely');
await request(untouched, 'POST', '/api/session', { userId: 'demo_user_dairy' });
check(
  'an account that never chose a scheme sets no theme cookie',
  untouched.value('omonettab_theme') === undefined,
  `cookie=${String(untouched.value('omonettab_theme'))}`
);

// ---------- summary ----------
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) {
  console.log('FAILING:');
  for (const f of failed) console.log(` - ${f.name}${f.detail ? `  [${f.detail}]` : ''}`);
  process.exit(1);
}
