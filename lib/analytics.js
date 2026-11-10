// Server-side product events for the API (quote served, booking request created).
// Rules: production only, anonymous ($process_person_profile false), never a name, contact or IP,
// ~800 ms cap, and it can never fail or delay a response: the event is sent after the response
// is written, kept alive with Vercel's waitUntil when available.
import { randomUUID } from 'node:crypto';
import { POSTHOG_KEY } from './posthog-key.js';
import { fetchWithin } from './http.js';

export const CAPTURE_URL = 'https://eu.i.posthog.com/i/v0/e/';
const TIMEOUT_MS = 800;

export const analyticsEnabled = () => process.env.VERCEL_ENV === 'production';

/** Sends one event. Resolves to true/false, never rejects. */
export async function capture(event, properties = {}, { timeoutMs = TIMEOUT_MS } = {}) {
  if (!analyticsEnabled()) return false;
  try {
    const r = await fetchWithin(CAPTURE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: randomUUID(),
        timestamp: new Date().toISOString(),
        properties: { ...properties, site: 'tours', source: 'api', $process_person_profile: false, $geoip_disable: true },
      }),
    }, timeoutMs);
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Keep a promise running after the response has been sent. On Vercel this is the
 * request context's waitUntil (what @vercel/functions uses); elsewhere the caller awaits it.
 */
export function afterResponse(promise) {
  const ctx = globalThis[Symbol.for('@vercel/request-context')]?.get?.();
  if (typeof ctx?.waitUntil === 'function') { ctx.waitUntil(promise); return Promise.resolve(); }
  return promise;
}
