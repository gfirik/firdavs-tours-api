export function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.end(JSON.stringify(body));
}
export async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  let s = '';
  for await (const c of req) s += c;
  try { return s ? JSON.parse(s) : {}; } catch { return null; }
}
export function q(req) { return new URL(req.url, 'http://x').searchParams; }

/** fetch with a hard deadline (an explicit timer, so the deadline also holds where unref'd timers don't fire). */
export async function fetchWithin(url, init, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(new Error('timeout')), ms);
  try { return await fetch(url, { ...init, signal: ctrl.signal }); } finally { clearTimeout(timer); }
}
