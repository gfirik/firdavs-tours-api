import { quote } from '../lib/core.js';
import { send, q } from '../lib/http.js';
import { capture, afterResponse } from '../lib/analytics.js';
// GET /api/quote?tour=classic-8&pax=2&class=comfort
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const p = q(req);
  const r = quote({ tourId: p.get('tour'), pax: p.get('pax'), hotelClass: p.get('class') });
  send(res, r.ok ? 200 : 400, r);
  const pax = Number(p.get('pax'));
  await afterResponse(capture('quote_served', {
    tour: String(p.get('tour') || '').slice(0, 40),
    pax: Number.isFinite(pax) ? pax : null,
    hotel_class: String(p.get('class') || '').toLowerCase().slice(0, 20),
    ok: r.ok,
  }));
}
