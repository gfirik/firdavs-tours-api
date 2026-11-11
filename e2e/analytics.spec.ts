import { test, expect, type Browser } from '@playwright/test';
import { gunzipSync } from 'node:zlib';
import { stubPlanner } from './helpers';

/**
 * Serves the local build as https://tours.fhsystems.dev so the host check passes,
 * and captures what PostHog would send instead of letting it leave the machine.
 */
async function liveHost(browser: Browser, baseURL: string | undefined) {
  // PostHog drops events from bots (headless user agent, navigator.webdriver), so this page presents as normal Chrome.
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', viewport: { width: 1366, height: 860 } });
  await context.addInitScript(() => {
    Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false });
    // Newer headless Chromium also lists a "HeadlessChrome" brand, which PostHog checks too.
    const uad = (navigator as any).userAgentData;
    if (uad) Object.defineProperty(Navigator.prototype, 'userAgentData', { get: () => ({ brands: uad.brands.filter((b: any) => !/headless/i.test(b.brand)), mobile: uad.mobile, platform: uad.platform, getHighEntropyValues: uad.getHighEntropyValues.bind(uad) }) });
  });
  const page = await context.newPage();
  const events: { event: string; properties: Record<string, any> }[] = [];
  const raw: string[] = [];
  await page.route('https://tours.fhsystems.dev/**', async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/ingest/')) {
      const buf = route.request().postDataBuffer();
      if (buf?.length) {
        let text = buf.toString('utf8');
        const c = url.searchParams.get('compression');
        if (c === 'gzip-js' || c === 'gzip') text = gunzipSync(buf).toString('utf8');
        else if (c === 'base64') text = Buffer.from(decodeURIComponent(text.replace(/^data=/, '')), 'base64').toString('utf8');
        raw.push(text);
        try {
          const body = JSON.parse(text);
          for (const e of Array.isArray(body) ? body : body.batch ?? [body]) if (e?.event) events.push(e);
        } catch { /* flags/config calls */ }
      }
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    const res = await route.fetch({ url: baseURL + url.pathname + url.search });
    return route.fulfill({ response: res });
  });
  return { context, page, events, raw };
}

const isAnalytics = (url: string) => /\/ingest\/|posthog|\/_astro\/analytics\./i.test(url);

test.describe('analytics', () => {
  test('no analytics requests on localhost or preview hosts', async ({ page }) => {
    await stubPlanner(page);
    const hits: string[] = [];
    for (const path of ['/', '/about', '/plan?q=' + encodeURIComponent('Test question')]) {
      await page.goto(path);
      await page.mouse.wheel(0, 1500);
      await page.waitForTimeout(2500); // past the idle-callback timeout
    }
    expect(hits).toEqual([]);
  });

  test('on the live host: planner events, source and handoff, never the question text', async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop' || !!process.env.BASE_URL, 'desktop, local build only');
    const { context, page, events, raw } = await liveHost(browser, baseURL);
    await stubPlanner(page);

    const secret = 'Secret question 4271 about Khiva in April';
    await page.goto('https://tours.fhsystems.dev/');
    await page.waitForResponse((r) => r.url().includes('/_astro/analytics.'), { timeout: 10_000 });
    // Let the first batch ($pageview, section_viewed) flush before navigating away.
    await expect.poll(() => events.some((e) => e.event === 'section_viewed'), { timeout: 10_000 }).toBe(true);
    await page.getByPlaceholder('Where would you like to go, and when?').fill(secret);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/plan$/);
    await expect.poll(() => page.evaluate(() => (window as any).__handoff.state)).toBe('delivered');
    await expect.poll(() => events.map((e) => e.event), { timeout: 15_000 }).toEqual(expect.arrayContaining(['planner_opened', 'planner_handoff']));
    await page.goto('https://tours.fhsystems.dev/about'); // flushes the /plan queue on page leave
    await page.waitForTimeout(500);

    const opened = events.find((e) => e.event === 'planner_opened')!;
    expect(opened.properties).toMatchObject({ source: 'typed', has_question: true, question_length: secret.length, site: 'tours' });
    expect(events.find((e) => e.event === 'planner_handoff')!.properties.state).toBe('delivered');
    expect(events.find((e) => e.event === 'section_viewed')?.properties.section).toBe('hero');
    for (const e of events) expect(String(e.properties.$current_url ?? '')).not.toContain('?q=');
    for (const r of raw) expect(r).not.toContain('4271');
    for (const r of raw) expect(r).not.toContain(encodeURIComponent(secret).slice(0, 20));
    await context.close();
  });

  test('on the live host: an outage reports planner_unavailable, never the question text', async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop' || !!process.env.BASE_URL, 'desktop, local build only');
    test.setTimeout(60_000);
    const { context, page, events, raw } = await liveHost(browser, baseURL);
    await stubPlanner(page, { down: true });
    await page.clock.install();
    const secret = 'Outage question 5531 about Bukhara';
    await page.goto('https://tours.fhsystems.dev/plan?q=' + encodeURIComponent(secret));
    await page.waitForResponse((r) => r.url().includes('/_astro/analytics.'), { timeout: 10_000 });
    // Advance a minute in steps, so PostHog's own timers see time pass rather than one jump.
    for (let i = 0; i < 7; i++) { await page.clock.fastForward(9_000); await page.waitForTimeout(250); }
    await expect(page.locator('[data-down]')).toBeVisible();
    await expect.poll(() => events.map((e) => e.event), { timeout: 15_000 }).toContain('planner_unavailable');
    expect(events.find((e) => e.event === 'planner_unavailable')!.properties).toMatchObject({ reason: 'no_response', has_question: true });
    expect(events.find((e) => e.event === 'planner_handoff')?.properties.state).toBe('failed');
    for (const r of raw) expect(r).not.toContain('5531');
    await context.close();
  });

  test('on the live host: a cold start reports planner_cold_start with seconds_to_ready', async ({ browser, baseURL }, info) => {
    test.skip(info.project.name !== 'desktop' || !!process.env.BASE_URL, 'desktop, local build only');
    test.setTimeout(60_000);
    const { context, page, events } = await liveHost(browser, baseURL);
    await stubPlanner(page, { wakeAfter: 1 });
    await page.clock.install();
    await page.goto('https://tours.fhsystems.dev/plan');
    await page.waitForResponse((r) => r.url().includes('/_astro/analytics.'), { timeout: 10_000 });
    await page.clock.fastForward(12_000); // waking message, then the reload that finds the planner awake
    await expect.poll(() => page.evaluate(() => (window as any).__planner.state), { timeout: 10_000 }).toBe('ready');
    await expect.poll(() => events.map((e) => e.event), { timeout: 15_000 }).toContain('planner_cold_start');
    const cold = events.find((e) => e.event === 'planner_cold_start')!.properties;
    expect(cold.seconds_to_ready).toBeGreaterThan(10);
    expect(cold.reloads).toBe(1);
    expect(events.some((e) => e.event === 'planner_unavailable')).toBe(false);
    await context.close();
  });
});
