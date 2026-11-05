import { persistent } from '../lib/store.js';
import { listTours } from '../lib/core.js';
import { send } from '../lib/http.js';
// GET /api/health — uptime check for monitoring
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  send(res, 200, { ok: true, service: 'firdavs-tours-api', version: '1.1.0', storage: persistent ? 'redis' : 'memory', tours: listTours().length, time: new Date().toISOString() });
}
