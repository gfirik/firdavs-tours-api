import { PLANNER_ORIGIN } from '../lib/site';

/**
 * The planner's host puts the agent to sleep when idle, and waking it takes ~30–45 s.
 * Pages that link to /plan send it one background request so it is awake by the time
 * the visitor clicks. Once per session, never on /plan itself (the iframe does it there),
 * and only after the first interaction plus an idle frame: a sleeping planner answers
 * with an error, which the browser logs, and page-load audits must never see that.
 */
const KEY = 'ft:planner-warmed';

const warmed = () => { try { return sessionStorage.getItem(KEY) !== null; } catch { return true; } };
const markWarmed = () => { try { sessionStorage.setItem(KEY, String(Date.now())); } catch { /* storage blocked */ } };

function ping() {
  if (warmed()) return;
  markWarmed();
  // Opaque no-cors GET: we never read the answer, the request alone wakes the agent.
  fetch(PLANNER_ORIGIN + '/', { mode: 'no-cors', credentials: 'omit', cache: 'no-store', keepalive: true }).catch(() => {});
}

const saveData = (navigator as any).connection?.saveData === true;
if (location.pathname !== '/plan' && !saveData && !warmed() && document.querySelector('a[href^="/plan"]')) {
  const events = ['pointermove', 'pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
  let fired = false;
  const go = () => {
    if (fired) return;
    fired = true;
    events.forEach((e) => window.removeEventListener(e, go));
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(ping, { timeout: 1500 });
    else window.setTimeout(ping, 300);
  };
  events.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
}
