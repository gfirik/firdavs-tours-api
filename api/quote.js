import { quote } from '../lib/core.js';
import { send, q } from '../lib/http.js';
// GET /api/quote?tour=classic-8&pax=2&class=comfort
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const p = q(req);
  const r = quote({ tourId: p.get('tour'), pax: p.get('pax'), hotelClass: p.get('class') });
  send(res, r.ok ? 200 : 400, r);
}
