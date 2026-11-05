import { departures } from '../lib/core.js';
import { send, q } from '../lib/http.js';
// GET /api/departures?tour=classic-group-8&from=2027-02-01
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  const p = q(req);
  const r = departures({ tourId: p.get('tour'), from: p.get('from') });
  send(res, r.ok ? 200 : 400, r);
}
