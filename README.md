# Firdavs Tours API

Small serverless API used by the Firdavs Tours Agentplace agent.

| Endpoint | What it does |
|---|---|
| `GET /api/tours` | List of the 14 tours |
| `GET /api/quote?tour=classic-8&pax=2&class=comfort` | Exact price: per person, single supplement, total, large-group flag |
| `GET /api/departures?tour=classic-group-8&from=2027-02-01` | Next fixed departures (group tour) or "private, runs all year" |
| `POST /api/requests` | Saves a booking request, returns `request_id` (validates name, email/Telegram, tour, travellers, class, dates) |
| `GET /api/requests` | Team view of saved requests (needs `Authorization: Bearer $ADMIN_TOKEN`) |

No dependencies. Node 20+. Tests: `npm test` (10 tests).

## Deploy (Vercel, ~5 min)
1. Push this folder to a new GitHub repo (e.g. `firdavs-tours-api`).
2. Vercel → New Project → import the repo → Deploy (no build settings needed).
3. Storage: Vercel → Storage → Upstash Redis (free) → connect to the project (adds `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Without it, requests are kept in memory (demo only).
4. Add env var `ADMIN_TOKEN` (any long random string) → Redeploy.
5. Give the deployed URL to the Agentplace builder: "call GET /api/quote for prices and POST /api/requests when the traveller books".

## Production notes
- Prices live in `lib/tours.json`; in production this would be a CMS/DB with an admin UI.
- Add rate limiting and a captcha-free spam check (e.g. per-IP limit) on `POST /api/requests`.
- Notify the team on each new request (Telegram bot or email) instead of polling `GET /api/requests`.
