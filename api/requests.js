import { validateRequest } from '../lib/core.js';
import { saveRequest, listRequests, persistent } from '../lib/store.js';
import { send, readJson } from '../lib/http.js';
// POST /api/requests  {name, contact, nationality, tour_id, travellers, hotel_class, dates, special_needs, language}
// GET  /api/requests  (Authorization: Bearer ADMIN_TOKEN) -> latest requests for the team
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  if (req.method === 'POST') {
    const body = await readJson(req);
    if (!body) return send(res, 400, { ok: false, error: 'invalid_json' });
    const v = validateRequest(body);
    if (!v.ok) return send(res, 422, v);
    const row = await saveRequest(v.record);
    return send(res, 201, { ok: true, request_id: row.id, persistent, message: 'Request received. A Firdavs Tours consultant will reply within 24 hours.' });
  }
  if (req.method === 'GET') {
    const auth = req.headers.authorization || '';
    if (!process.env.ADMIN_TOKEN || auth !== `Bearer ${process.env.ADMIN_TOKEN}`) return send(res, 401, { ok: false, error: 'unauthorized' });
    return send(res, 200, { ok: true, requests: await listRequests() });
  }
  send(res, 405, { ok: false, error: 'method_not_allowed' });
}
