# Firdavs Tours — product

## What it is
An Uzbekistan tour operator website whose core is a conversational trip planner. Travellers describe their trip, get a tour recommendation and an instant price for their group, and a human consultant confirms within 24 hours. Demonstration brand built on real 2026 prices.

## Audience
International travellers (English, Uzbek and Russian speakers) planning a first or second trip to Uzbekistan: couples, families, solo travellers, small groups of friends. They are comparing operators on trust, clarity of price and how much effort planning takes.

## The one thing to prove
Planning starts by just asking: the hero is the conversation starter, and it hands off to the planner at /plan with the question already sent.

## Catalogue truth
14 tours in `lib/tours.json` (single source of truth). Prices by group size (1 / 2 / 3–4 / 5+) and hotel class (Standard / Comfort / Premium); one small-group tour with fixed departures (max 16). Practical facts in `docs/context/facts.json`.

## Voice
Warm, precise, unhurried. A knowledgeable local consultant, not a chatbot. Short sentences, concrete place names, honest about what is and isn't offered.

## Hard constraints
- Never show implementation words on public pages (API routes, vendor or model names, "iframe").
- No alcohol, bars, nightlife. Not religiously branded; mosques and madrasas appear as architecture. No Termez Buddhist sites.
- No fake testimonials, ratings, partner logos, awards, traveller counts or invented stats.
- Prices only from `lib/tours.json`. No analytics.
- Only licensed photos with attribution; no close-up identifiable people.
- Visa: point to e-visa.gov.uz, no hard claims. Payments are not taken online.

## Visual commitments (pinned by owner)
Samarkand tilework palette: deep lapis/navy, turquoise accent (#3cc6c0 family), sand/gold (#d9b46a), off-white text. Cormorant Garamond headings, clean sans body (Source Sans, matching the planner). Must match the planner's own look so / → /plan reads as one product. The planner follows the OS colour scheme (navy dark / cream light), so the site does too.
