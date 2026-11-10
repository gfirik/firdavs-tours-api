import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { capture, CAPTURE_URL } from '../lib/analytics.js';
import quoteHandler from '../api/quote.js';
import requestsHandler from '../lib/requests-handler.js';
import { _resetMemory } from '../lib/store.js';
import { POSTHOG_KEY } from '../lib/posthog-key.js';

const realFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: JSON.parse(init.body) }); return { ok: true }; };
  delete process.env.VERCEL_ENV;
  _resetMemory();
});
afterEach(() => { globalThis.fetch = realFetch; delete process.env.VERCEL_ENV; });

function run(handler, { method = 'GET', url = '/', body, headers = {} } = {}) {
  return new Promise((resolve) => {
    const out = { ended: false };
    const res = {
      statusCode: 0, headers: {},
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(s) { out.ended = true; out.status = this.statusCode; out.body = s ? JSON.parse(s) : null; },
    };
    Promise.resolve(handler({ method, url, body, headers: { 'x-forwarded-for': '5.5.5.5', ...headers } }, res)).then(() => resolve(out));
  });
}

test('analytics: silent outside production (local, preview)', async () => {
  assert.equal(await capture('x', {}), false);
  process.env.VERCEL_ENV = 'preview';
  assert.equal(await capture('x', {}), false);
  await run(quoteHandler, { url: '/api/quote?tour=classic-8&pax=2&class=comfort' });
  assert.equal(calls.length, 0);
});

test('analytics: anonymous event to the EU endpoint in production', async () => {
  process.env.VERCEL_ENV = 'production';
  assert.equal(await capture('ping', { a: 1 }), true);
  assert.equal(calls[0].url, CAPTURE_URL);
  assert.equal(calls[0].url, 'https://eu.i.posthog.com/i/v0/e/');
  const b = calls[0].body;
  assert.equal(b.api_key, POSTHOG_KEY);
  assert.equal(b.event, 'ping');
  assert.equal(b.properties.$process_person_profile, false);
  assert.equal(b.properties.site, 'tours');
  assert.equal(b.properties.a, 1);
});

test('analytics: a hanging endpoint gives up after ~800 ms and never throws', async () => {
  process.env.VERCEL_ENV = 'production';
  globalThis.fetch = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(init.signal.reason)));
  const t0 = Date.now();
  assert.equal(await capture('slow', {}), false);
  const ms = Date.now() - t0;
  assert.ok(ms >= 700 && ms < 1500, `took ${ms} ms`);
  globalThis.fetch = async () => { throw new Error('offline'); };
  assert.equal(await capture('offline', {}), false);
});

test('analytics: /api/quote responds first, then sends quote_served', async () => {
  process.env.VERCEL_ENV = 'production';
  let endedBeforeFetch = null, res0;
  globalThis.fetch = async (url, init) => { endedBeforeFetch = res0.ended; calls.push({ url, body: JSON.parse(init.body) }); return { ok: true }; };
  const p = new Promise((resolve) => {
    const out = (res0 = { ended: false });
    const res = { statusCode: 0, setHeader() {}, end(s) { out.ended = true; out.status = this.statusCode; out.body = JSON.parse(s); } };
    quoteHandler({ method: 'GET', url: '/api/quote?tour=classic-8&pax=2&class=Comfort', headers: {} }, res).then(() => resolve(out));
  });
  const out = await p;
  assert.equal(out.status, 200);
  assert.equal(out.body.quote.total_usd, 5070);
  assert.equal(endedBeforeFetch, true);
  assert.equal(calls[0].body.event, 'quote_served');
  assert.deepEqual(
    Object.fromEntries(['tour', 'pax', 'hotel_class', 'ok'].map((k) => [k, calls[0].body.properties[k]])),
    { tour: 'classic-8', pax: 2, hotel_class: 'comfort', ok: true },
  );
});

test('analytics: failed quotes are counted too', async () => {
  process.env.VERCEL_ENV = 'production';
  const out = await run(quoteHandler, { url: '/api/quote?tour=nope&pax=2&class=comfort' });
  assert.equal(out.status, 400);
  assert.equal(calls[0].body.properties.ok, false);
});

test('analytics: booking_request_created carries no personal data', async () => {
  process.env.VERCEL_ENV = 'production';
  const body = { name: 'Test User', contact: 'test@example.com', nationality: 'Germany', special_needs: 'vegetarian', tour_id: 'classic-8', travellers: 2, hotel_class: 'comfort', dates: 'April 2027', language: 'Russian' };
  const out = await run(requestsHandler, { method: 'POST', body });
  assert.equal(out.status, 201);
  const ev = calls.find((c) => c.body.event === 'booking_request_created');
  assert.ok(ev, 'event sent');
  const props = ev.body.properties;
  assert.equal(props.tour_id, 'classic-8');
  assert.equal(props.travellers, 2);
  assert.equal(props.hotel_class, 'comfort');
  assert.equal(props.language, 'Russian');
  const raw = JSON.stringify(ev.body);
  for (const s of ['Test User', 'test@example.com', 'Germany', 'vegetarian', '5.5.5.5', 'April 2027']) assert.ok(!raw.includes(s), `no "${s}" in the event`);
});

test('analytics: duplicates and rejected requests send nothing', async () => {
  process.env.VERCEL_ENV = 'production';
  const body = { name: 'Ann', contact: 'ann@example.com', tour_id: 'classic-8', travellers: 2, hotel_class: 'comfort', dates: 'May' };
  await run(requestsHandler, { method: 'POST', body, headers: { 'idempotency-key': 'dup' } });
  await run(requestsHandler, { method: 'POST', body, headers: { 'idempotency-key': 'dup' } });
  await run(requestsHandler, { method: 'POST', body: { name: 'x' } });
  assert.equal(calls.filter((c) => c.body.event === 'booking_request_created').length, 1);
});
