import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { formatAlert, notifyTeam } from '../lib/telegram.js';

const row = { id: 'FT-TEST123', tour_id: 'classic-8', travellers: 2, hotel_class: 'comfort', dates: 'April 2027', language: 'English', name: 'Test User', contact: 'test@example.com', nationality: 'Germany', special_needs: '' };

const realFetch = globalThis.fetch;
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), init }); return { ok: true }; };
  delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID;
});
afterEach(() => { globalThis.fetch = realFetch; delete process.env.TELEGRAM_BOT_TOKEN; delete process.env.TELEGRAM_CHAT_ID; });

test('telegram: off without env vars, nothing is sent', async () => {
  assert.equal(await notifyTeam(row), false);
  process.env.TELEGRAM_BOT_TOKEN = 'only-token';
  assert.equal(await notifyTeam(row), false);
  assert.equal(calls.length, 0);
});

test('telegram: sends reference, tour, dates, group, class, total, language and contact', async () => {
  process.env.TELEGRAM_BOT_TOKEN = '123:abc'; process.env.TELEGRAM_CHAT_ID = '-10042';
  assert.equal(await notifyTeam(row), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.telegram.org/bot123:abc/sendMessage');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.chat_id, '-10042');
  for (const s of ['FT-TEST123', 'Classic Silk Road', '8 days', 'April 2027', '2 travellers, Comfort hotels', '$5,070', '$2,535 per person', 'Language: English', 'Test User, test@example.com'])
    assert.ok(body.text.includes(s), `message contains "${s}"`);
});

test('telegram: solo supplement and 10+ groups are spelled out', () => {
  assert.match(formatAlert({ ...row, travellers: 1, hotel_class: 'premium' }), /\$7,030 .*\$950 single supplement/);
  assert.match(formatAlert({ ...row, travellers: 12, hotel_class: 'standard' }), /Total: from \$[\d,]+ \(10\+ travellers: custom group price needed\)/);
});

test('telegram: a failing API never throws', async () => {
  process.env.TELEGRAM_BOT_TOKEN = '123:abc'; process.env.TELEGRAM_CHAT_ID = '42';
  globalThis.fetch = async () => { throw new Error('network down'); };
  assert.equal(await notifyTeam(row), false);
});
