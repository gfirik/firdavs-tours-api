/**
 * Remembers how a visitor reached the planner, without touching the /plan?q= URLs.
 * Runs on every page (it is tiny), independent of analytics: a click or submit that
 * leads to /plan writes the source to sessionStorage; /plan reads it once and clears it,
 * so a reload or a direct visit counts as "direct".
 */
export type PlanSource = 'typed' | 'chip' | 'tour_card' | 'destination' | 'header' | 'footer' | 'cta' | 'direct';
const KEY = 'ft:plan-source';

const save = (s: PlanSource) => { try { sessionStorage.setItem(KEY, s); } catch { /* storage blocked */ } };

function sourceOf(el: Element): PlanSource {
  const own = el.closest<HTMLElement>('[data-plan-source]')?.dataset.planSource;
  if (own) return own as PlanSource;
  if (el.closest('.planner .chip')) return 'chip';
  if (el.closest('.tour-link, .more-list')) return 'tour_card';
  if (el.closest('.dest-strip')) return 'destination';
  if (el.closest('.site-header')) return 'header';
  if (el.closest('footer')) return 'footer';
  return 'cta';
}

if (location.pathname === '/plan') {
  let s: string | null = null;
  try { s = sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); } catch { /* storage blocked */ }
  (window as any).__planSource = (s as PlanSource) || 'direct';
} else {
  document.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
    if (!a || a.origin !== location.origin || a.pathname !== '/plan') return;
    save(sourceOf(a));
  }, { capture: true });
  document.addEventListener('submit', (e) => {
    const f = e.target as HTMLFormElement;
    if (new URL(f.action, location.href).pathname === '/plan') save('typed');
  }, { capture: true });
}
