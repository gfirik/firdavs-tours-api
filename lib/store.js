// Upstash Redis via REST if configured (KV_REST_API_URL/TOKEN from the Vercel Upstash integration), else in-memory (demo only).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const mem = [];

async function redis(cmd) {
  const r = await fetch(URL_, { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('redis_' + r.status);
  return (await r.json()).result;
}

export const persistent = Boolean(URL_ && TOKEN);

export async function saveRequest(rec) {
  const id = 'FT-' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
  const row = { id, created_at: new Date().toISOString(), status: 'new', ...rec };
  if (persistent) await redis(['LPUSH', 'ft:requests', JSON.stringify(row)]);
  else mem.unshift(row);
  return row;
}

export async function listRequests(limit = 50) {
  if (persistent) return (await redis(['LRANGE', 'ft:requests', 0, limit - 1])).map((s) => JSON.parse(s));
  return mem.slice(0, limit);
}
