# API

Serverless functions in `api/` (Node 22, zero dependencies), deployed by Vercel next to the static site. The trip planner calls them as tools: prices are always computed here, never by the language model.

| Endpoint | What it does |
|---|---|
| `GET /api/tours` | List of the 14 tours |
| `GET /api/quote?tour=classic-8&pax=2&class=comfort` | Exact price: per person, single supplement, total, large-group flag (this example: `total_usd: 5070`) |
| `GET /api/departures?tour=classic-group-8&from=2027-02-01` | Next fixed departures (group tour) or "private, runs all year" |
| `POST /api/requests` | Saves a booking request and returns `request_id`. Validates name, email/Telegram, tour, travellers, class and dates. Rate limit 5 per 10 min per IP; an `Idempotency-Key` header prevents duplicates on retries; the honeypot field `website` blocks form bots |
| `GET /api/health` | Uptime check (storage mode, tour count) |
| `GET /api/requests` | Team view of saved requests (needs `Authorization: Bearer $ADMIN_TOKEN`) |

All prices come from `lib/tours.json`, which is also the site's single source of truth.

## Environment

| Variable | Purpose |
|---|---|
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis (added by the Vercel integration). Without them, requests are kept in memory (demo only) |
| `ADMIN_TOKEN` | Bearer token for `GET /api/requests` |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Optional: the sales team gets a Telegram message on every new request |

## Production notes

- Prices live in `lib/tours.json`; in production this would be a CMS/DB with an admin UI, versioned so quotes are reproducible.
- Done: per-IP rate limit, honeypot, idempotency keys, Telegram alerts, health check.
- Next: admin UI for prices and request status, a signed webhook for the CRM, structured logs and alerting, signed requests between planner and API.
