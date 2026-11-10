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

if (shouldTrack) {
  // Safari only shipped requestIdleCallback in 17.4.
  if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 2000 });
  else window.setTimeout(start, 1200);
}
