import { analytics } from '../lib/analytics-config';

/**
 * posthog-js is larger than everything else the site ships, so it stays out of the
 * initial bundle: a separate chunk fetched on the first idle frame. The host check runs
 * first, so localhost and Vercel preview hosts never even fetch the chunk.
 */
const shouldTrack = Boolean(analytics.key) && window.location.hostname === analytics.reportFromHost;

const start = () => {
  import('./analytics')
    .then((m) => m.initAnalytics())
    .catch(() => {
      // Analytics must never be the reason the page breaks.
    });
};

// Safari only shipped requestIdleCallback in 17.4.
const whenIdle = () => {
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 2000 });
  else window.setTimeout(start, 1200);
};

if (shouldTrack) {
  if (location.pathname === '/plan') {
    // Visitors interact inside the planner, which the page never hears about: load at idle.
    whenIdle();
  } else {
    // Content pages: wait for the first interaction (or a few quiet seconds) so parsing the
    // library never competes with the first render.
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const;
    let fired = false;
    const go = () => {
      if (fired) return;
      fired = true;
      events.forEach((e) => window.removeEventListener(e, go));
      whenIdle();
    };
    events.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
    window.setTimeout(go, 6000);
  }
}
