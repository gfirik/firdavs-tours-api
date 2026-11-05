// Upstash Redis via REST if configured (KV_REST_API_URL/TOKEN from the Vercel Upstash integration), else in-memory (demo/tests).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = { rows: [], counters: new Map(), keys: new Map() };

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis_' + r.status);
  return (await r.json()).result;
}

export const persistent = Boolean(URL_ && TOKEN);

export function newId() {
  return 'FT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
}

export async function saveRequest(rec) {
  const row = { id: newId(), created_at: new Date().toISOString(), status: 'new', ...rec };
  if (persistent) await redis(['LPUSH', 'ft:requests', JSON.stringify(row)]);
  else mem.rows.unshift(row);
  return row;
}

export async function listRequests(limit = 50) {
  if (persistent) return (await redis(['LRANGE', 'ft:requests', 0, limit - 1])).map((s) => JSON.parse(s));
  return mem.rows.slice(0, limit);
}

// Fixed-window rate limit: returns current count for key within windowSec.
export async function hit(key, windowSec) {
  if (persistent) {
    const n = await redis(['INCR', `ft:rl:${key}`]);
    if (n === 1) await redis(['EXPIRE', `ft:rl:${key}`, windowSec]);
    return n;
  }
  const now = Date.now();
  const c = mem.counters.get(key);
  if (!c || c.until < now) { mem.counters.set(key, { n: 1, until: now + windowSec * 1000 }); return 1; }
  c.n += 1;
  return c.n;
}

// Idempotency: remember the request id returned for a client key for 24h, so retries never create duplicates.
export async function getIdem(key) {
  if (persistent) return redis(['GET', `ft:idem:${key}`]);
  const v = mem.keys.get(key);
  return v && v.until > Date.now() ? v.id : null;
}
export async function setIdem(key, id) {
  if (persistent) return redis(['SET', `ft:idem:${key}`, id, 'EX', 86400]);
  mem.keys.set(key, { id, until: Date.now() + 86400000 });
}

export function _resetMemory() { mem.rows.length = 0; mem.counters.clear(); mem.keys.clear(); }
