import posthog from 'posthog-js';
import { analytics as config } from '../lib/analytics-config';

/**
 * PostHog, cookieless (memory persistence, so no consent banner; a returning visitor
 * looks new). The typed question is never sent: only whether there was one and its length.
 *
 * Events: $pageview, section_viewed, planner_opened, planner_handoff, planner_unavailable,
 * planner_recovered, planner_copy_clicked,
 * agency_cta_click, outbound_clicked. Server events (quote_served, booking_request_created)
 * come from lib/analytics.js.
 */
export function initAnalytics() {
  posthog.init(config.key, {
    api_host: config.ingestPath,
    ui_host: config.uiHost,
    defaults: '2026-06-25',
    persistence: 'memory',
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    capture_pageleave: true,
    capture_performance: true,
    session_recording: { maskAllInputs: true },
  });
  posthog.register({ site: 'tours' });

  if (location.pathname === '/plan') trackPlanner();
  else trackSections();
  trackClicks();
}

/** Once per section as it crosses the middle of the viewport. */
function trackSections() {
  const sections = document.querySelectorAll<HTMLElement>('main [data-section]');
  if (!sections.length) return;
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        posthog.capture('section_viewed', { section: (entry.target as HTMLElement).dataset.section });
      }
    },
    { rootMargin: '-45% 0px -45% 0px' },
  );
  sections.forEach((el) => observer.observe(el));
}

type Handoff = { q: string; state: 'none' | 'waiting' | 'delivered' | 'failed' };

function trackPlanner() {
  const h = (window as any).__handoff as Handoff | undefined;
  const q = h?.q ?? '';
  posthog.capture('planner_opened', {
    source: (window as any).__planSource ?? 'direct',
    has_question: q.length > 0,
    question_length: q.length,
  });
  // No answer from the planner within the wait: the page switched to the enquiry form.
  let down = false;
  const reportDown = () => {
    if (down) return;
    down = true;
    posthog.capture('planner_unavailable', { reason: 'no_response', has_question: q.length > 0 });
  };
  if ((window as any).__planner?.state === 'unavailable') reportDown();
  document.addEventListener('planner:unavailable', reportDown);
  document.addEventListener('planner:back', () => posthog.capture('planner_recovered'));

  if (!q) return;
  let sent = false;
  const report = (state: 'delivered' | 'failed') => {
    if (sent) return;
    sent = true;
    posthog.capture('planner_handoff', { state });
  };
  // PostHog loads at idle, often after the handoff settled: replay the final state.
  if (h?.state === 'delivered' || h?.state === 'failed') report(h.state);
  document.addEventListener('handoff:delivered', () => report('delivered'));
  document.addEventListener('handoff:failed', () => report('failed'));
}

function placeOf(el: Element) {
  if (el.closest('.site-header')) return 'header';
  if (el.closest('footer')) return 'footer';
  if (location.pathname === '/plan') return 'plan';
  return el.closest<HTMLElement>('[data-section]')?.dataset.section ?? el.closest('section[id]')?.id ?? location.pathname;
}

/** One delegated listener covers the copy button, every fhsystems CTA and every way out of the site. */
function trackClicks() {
  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest('[data-hint-copy]')) posthog.capture('planner_copy_clicked');
    const link = target.closest('a[href]');
    if (!(link instanceof HTMLAnchorElement)) return;
    const agency = link.closest<HTMLElement>('[data-agency]')?.dataset.agency;
    if (agency) posthog.capture('agency_cta_click', { placement: agency });
    if (link.protocol.startsWith('http') && link.host !== location.host) {
      posthog.capture('outbound_clicked', { host: link.host, place: placeOf(link) });
    }
  }, { capture: true });
}
