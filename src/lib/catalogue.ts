// Everything price- or tour-related on the site is derived from lib/tours.json,
// the same file the quote functions use. Nothing here is hard-coded.
import toursJson from '../../lib/tours.json';
// @ts-ignore: plain JS module shared with the serverless functions
import { quote as coreQuote } from '../../lib/core.js';

export type PriceTable = Record<string, number> | null;
export interface Tour {
  id: string;
  name: string;
  days: number;
  type: 'private' | 'group';
  themes: string[];
  cities: string[];
  season: string;
  price: Record<string, PriceTable>;
  highlights: string[];
  includes: string[];
  excludes: string[];
  departures_2026_27?: string[];
  max_group?: number;
}

export const tours = toursJson as Tour[];

export function tourById(id: string): Tour {
  const t = tours.find((x) => x.id === id);
  if (!t) throw new Error(`Unknown tour id in site config: ${id}`);
  return t;
}

/** Lowest per-person price across every hotel class and group-size tier. */
export function fromPrice(t: Tour): number {
  const all = Object.values(t.price)
    .filter((v): v is Record<string, number> => !!v)
    .flatMap((table) => Object.values(table));
  return Math.min(...all);
}

export const usd = (n: number) => '$' + n.toLocaleString('en-US');

export function nextDepartures(t: Tour, from = new Date(), count = 2): string[] {
  return (t.departures_2026_27 ?? []).filter((d) => new Date(d) >= from).slice(0, count);
}

export const fmtDate = (iso: string) =>
  new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function quote(tourId: string, pax: number, hotelClass: string) {
  const r = coreQuote({ tourId, pax, hotelClass });
  if (!r.ok) throw new Error(`Quote failed for ${tourId}: ${r.error}`);
  return r.quote as { per_person_usd: number; total_usd: number; tour_name: string; days: number; travellers: number; hotel_class: string };
}

export const tourStarter = (t: Tour) =>
  `Tell me about the ${t.name} (${t.days} ${t.days === 1 ? 'day' : 'days'}): what's included, and how much is it?`;

export const planHref = (q: string) => `/plan?q=${encodeURIComponent(q)}`;
