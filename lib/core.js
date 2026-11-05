import tours from './tours.json' with { type: 'json' };

export const CLASSES = ['standard', 'comfort', 'premium'];

export function bracket(pax) {
  if (pax <= 1) return '1';
  if (pax === 2) return '2';
  if (pax <= 4) return '3-4';
  return '5+';
}

export function findTour(id) {
  return tours.find((t) => t.id === id);
}

export function listTours() {
  return tours.map(({ id, name, days, type, cities, themes, season }) => ({ id, name, days, type, cities, themes, season }));
}

// Returns { ok, quote } or { ok:false, error }
export function quote({ tourId, pax, hotelClass }) {
  const t = findTour(tourId);
  if (!t) return { ok: false, error: 'unknown_tour' };
  const n = Number(pax);
  if (!Number.isInteger(n) || n < 1 || n > 40) return { ok: false, error: 'pax_must_be_1_to_40' };
  const cls = String(hotelClass || '').toLowerCase();
  if (!CLASSES.includes(cls)) return { ok: false, error: 'hotel_class_must_be_standard_comfort_or_premium' };
  const table = t.price?.[cls];
  if (!table) return { ok: false, error: 'class_not_offered_for_this_tour' };

  let perPerson;
  let tier;
  if (t.type === 'group') {
    perPerson = table.per_person;
    tier = 'group';
    if (n > (t.max_group || 16)) return { ok: false, error: 'exceeds_group_size' };
  } else {
    tier = bracket(n);
    perPerson = table[tier];
  }
  const singleSupplement = n === 1 && t.single_supplement ? t.single_supplement[cls] || 0 : 0;
  const total = perPerson * n + singleSupplement;
  return {
    ok: true,
    quote: {
      tour_id: t.id,
      tour_name: t.name,
      days: t.days,
      travellers: n,
      hotel_class: cls,
      price_tier: tier,
      per_person_usd: perPerson,
      single_supplement_usd: singleSupplement,
      total_usd: total,
      custom_group_price: t.type !== 'group' && n >= 10,
      includes: t.includes,
      excludes: t.excludes,
      note: '2026 estimate in USD, confirmed by a Firdavs Tours consultant at booking.'
    }
  };
}

export function departures({ tourId, from }) {
  const t = findTour(tourId);
  if (!t) return { ok: false, error: 'unknown_tour' };
  if (t.type !== 'group') return { ok: true, tour_id: t.id, type: 'private', runs: t.season, departures: [] };
  const start = from ? new Date(from) : new Date();
  if (Number.isNaN(start.getTime())) return { ok: false, error: 'bad_from_date' };
  const list = (t.departures_2026_27 || []).filter((d) => new Date(d) >= start);
  return { ok: true, tour_id: t.id, type: 'group', departures: list };
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TG = /^@?[A-Za-z0-9_]{5,32}$/;

export function validateRequest(b = {}) {
  const errors = [];
  const name = String(b.name || '').trim();
  const contact = String(b.contact || '').trim();
  if (name.length < 2) errors.push('name');
  if (!(EMAIL.test(contact) || TG.test(contact))) errors.push('contact');
  if (!findTour(b.tour_id)) errors.push('tour_id');
  const n = Number(b.travellers);
  if (!Number.isInteger(n) || n < 1 || n > 40) errors.push('travellers');
  if (!CLASSES.includes(String(b.hotel_class || '').toLowerCase())) errors.push('hotel_class');
  if (!String(b.dates || '').trim()) errors.push('dates');
  if (errors.length) return { ok: false, missing_or_invalid: errors, hint: errors.includes('contact') ? 'contact must be an email or a Telegram @username' : undefined };
  return {
    ok: true,
    record: {
      name: name.slice(0, 100),
      contact: contact.slice(0, 100),
      nationality: String(b.nationality || '').slice(0, 60),
      tour_id: b.tour_id,
      travellers: n,
      hotel_class: String(b.hotel_class).toLowerCase(),
      dates: String(b.dates).slice(0, 60),
      special_needs: String(b.special_needs || '').slice(0, 500),
      language: String(b.language || '').slice(0, 10)
    }
  };
}
