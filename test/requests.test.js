import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../lib/requests-handler.js';
import { _resetMemory } from '../lib/store.js';

function call({ method = 'POST', body, headers = {}, ip = '1.1.1.1' } = {}) {
  return new Promise((resolve) => {
    const res = {
      headers: {}, statusCode: 0,
      setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
      end(s) { resolve({ status: this.statusCode, headers: this.headers, body: s ? JSON.parse(s) : null }); },
    };
    handler({ method, body, headers: { 'x-forwarded-for': ip, ...headers } }, res);
  });
}

const good = { name: 'Test User', contact: 'test@example.com', tour_id: 'classic-8', travellers: 2, hotel_class: 'comfort', dates: 'April 2027', nationality: 'Germany', language: 'English' };

beforeEach(() => _resetMemory());

test('valid request -> 201 with FT- id', async () => {
  const r = await call({ body: good });
  assert.equal(r.status, 201);
  assert.match(r.body.request_id, /^FT-[A-Z0-9]+$/);
  assert.equal(r.body.notified, false); // Telegram is off without env vars
});

test('missing fields -> 422 listing them', async () => {
  const r = await call({ body: { name: 'x' } });
  assert.equal(r.status, 422);
  assert.ok(r.body.missing_or_invalid.includes('contact'));
});

test('idempotency key returns the same id, no duplicate', async () => {
  const a = await call({ body: good, headers: { 'idempotency-key': 'k1' } });
  const b = await call({ body: good, headers: { 'idempotency-key': 'k1' } });
  assert.equal(a.body.request_id, b.body.request_id);
  assert.equal(b.body.duplicate, true);
});

test('rate limit: 6th request from same IP in window -> 429', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await call({ body: good, ip: '9.9.9.9' })).status, 201);
  const r = await call({ body: good, ip: '9.9.9.9' });
  assert.equal(r.status, 429);
  assert.equal(r.headers['retry-after'], '600');
  assert.equal((await call({ body: good, ip: '8.8.8.8' })).status, 201);
});

test('honeypot field rejects bots', async () => {
  assert.equal((await call({ body: { ...good, website: 'spam.biz' } })).status, 400);
});

test('GET without admin token -> 401', async () => {
  assert.equal((await call({ method: 'GET' })).status, 401);
});

test('enquiry from the /plan fallback -> 201 with FT- id, same honeypot and rate limit', async () => {
  const enquiry = { kind: 'enquiry', name: 'Test User', contact: 'test@example.com', message: 'Family of four in April, what do you suggest?', source: 'plan_fallback' };
  const r = await call({ body: enquiry, ip: '7.7.7.7' });
  assert.equal(r.status, 201);
  assert.match(r.body.request_id, /^FT-[A-Z0-9]+$/);
  assert.equal((await call({ body: { ...enquiry, website: 'x' }, ip: '7.7.7.7' })).status, 400);
  assert.equal((await call({ body: { ...enquiry, message: '' }, ip: '7.7.7.7' })).status, 422);
});
