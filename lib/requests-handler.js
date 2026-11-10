import { validateRequest } from './core.js';
import { saveRequest, listRequests, persistent, hit, getIdem, setIdem } from './store.js';
import { send, readJson } from './http.js';
import { notifyTeam } from './telegram.js';
import { capture, afterResponse } from './analytics.js';

const LIMIT = 5; // booking requests per IP
const WINDOW = 600; // per 10 minutes

function clientIp(req) {
  const f = req.headers['x-forwarded-for'];
  return (Array.isArray(f) ? f[0] : (f || '')).split(',')[0].trim() || req.socket?.remoteAddress || 'unknown';
}


// POST /api/requests  {name, contact, nationality, tour_id, travellers, hotel_class, dates, special_needs, language}
//   Headers: Idempotency-Key (optional) — same key returns the same request_id instead of a duplicate.
// GET  /api/requests  (Authorization: Bearer ADMIN_TOKEN) -> latest requests for the team
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'POST') {
    const body = await readJson(req);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return send(res, 400, { ok: false, error: 'invalid_json' });
    if (body.website) return send(res, 400, { ok: false, error: 'rejected' }); // honeypot for form bots

    const idemKey = String(req.headers['idempotency-key'] || '').slice(0, 100);
    if (idemKey) {
      const prev = await getIdem(idemKey);
      if (prev) return send(res, 200, { ok: true, request_id: prev, persistent, duplicate: true, message: 'Request already received. A Firdavs Tours consultant will reply within 24 hours.' });
    }

    const v = validateRequest(body);
    if (!v.ok) return send(res, 422, v);

    if ((await hit(clientIp(req), WINDOW)) > LIMIT) {
      res.setHeader('Retry-After', String(WINDOW));
      return send(res, 429, { ok: false, error: 'too_many_requests' });
    }

    const row = await saveRequest(v.record);
    if (idemKey) await setIdem(idemKey, row.id);
    const notified = await notifyTeam(row);
    send(res, 201, { ok: true, request_id: row.id, persistent, notified, message: 'Request received. A Firdavs Tours consultant will reply within 24 hours.' });
    // Anonymous product event: no name, contact, nationality, notes or IP.
    return afterResponse(capture('booking_request_created', {
      tour_id: row.tour_id, travellers: row.travellers, hotel_class: row.hotel_class, language: row.language || null,
    }));
  }
  if (req.method === 'GET') {
    const auth = req.headers.authorization || '';
    if (!process.env.ADMIN_TOKEN || auth !== `Bearer ${process.env.ADMIN_TOKEN}`) return send(res, 401, { ok: false, error: 'unauthorized' });
    return send(res, 200, { ok: true, requests: await listRequests() });
  }
  send(res, 405, { ok: false, error: 'method_not_allowed' });
}
