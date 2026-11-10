// Telegram alert to the sales team for every new booking request.
// Off unless both TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID are set (never hardcode them).
import { quote, findTour } from './core.js';

const CLASS = { standard: 'Standard', comfort: 'Comfort', premium: 'Premium' };
const usd = (n) => '$' + Number(n).toLocaleString('en-US');

/** Plain-text message: reference, tour, dates, group, hotel class, total, language, contact. */
export function formatAlert(row) {
  const t = findTour(row.tour_id);
  const q = quote({ tourId: row.tour_id, pax: row.travellers, hotelClass: row.hotel_class });
  const hotels = CLASS[row.hotel_class] || row.hotel_class;
  let total = 'no price for this combination, consultant to quote';
  if (q.ok) {
    const sup = q.quote.single_supplement_usd ? ` incl. ${usd(q.quote.single_supplement_usd)} single supplement` : '';
    total = q.quote.custom_group_price
      ? `from ${usd(q.quote.total_usd)} (10+ travellers: custom group price needed)`
      : `${usd(q.quote.total_usd)} (${usd(q.quote.per_person_usd)} per person${sup})`;
  }
  const lines = [
    `New booking request ${row.id}`,
    '',
    `Tour: ${t ? `${t.name} (${t.days} ${t.days === 1 ? 'day' : 'days'})` : row.tour_id}`,
    `Dates: ${row.dates}`,
    `Group: ${row.travellers} ${row.travellers === 1 ? 'traveller' : 'travellers'}, ${hotels} hotels`,
    `Total: ${total}`,
    `Language: ${row.language || 'not given'}`,
    `Contact: ${row.name}, ${row.contact}`,
  ];
  if (row.nationality) lines.push(`Nationality: ${row.nationality}`);
  if (row.special_needs) lines.push(`Notes: ${row.special_needs}`);
  lines.push('', 'Reply within 24 hours.');
  return lines.join('\n');
}

export const telegramEnabled = () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);

/** Returns true when Telegram accepted the message. Never throws; gives up after timeoutMs. */
export async function notifyTeam(row, { timeoutMs = 2500 } = {}) {
  if (!telegramEnabled()) return false;
  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID, text: formatAlert(row), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return r.ok;
  } catch {
    return false;
  }
}
