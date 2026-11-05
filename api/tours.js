import { listTours } from '../lib/core.js';
import { send } from '../lib/http.js';
export default function handler(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, {});
  send(res, 200, { tours: listTours() });
}
