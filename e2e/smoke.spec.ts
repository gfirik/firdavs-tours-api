import { test, expect } from '@playwright/test';
import tours from '../lib/tours.json' with { type: 'json' };
import { stubPlanner, plannerText } from './helpers';

const fromPrice = (t: any) =>
  Math.min(...Object.values(t.price).filter(Boolean).flatMap((x: any) => Object.values(x) as number[]));
const usd = (n: number) => '$' + n.toLocaleString('en-US');

test.describe('landing page', () => {
  test('hero, starters and featured tours render with real prices', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Firdavs Tours/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByPlaceholder('Where would you like to go, and when?')).toBeVisible();
    await expect(page.locator('.planner .chip')).toHaveCount(6);

    const cards = page.locator('.tour');
    await expect(cards).toHaveCount(6);
    for (const card of await cards.all()) {
      const name = (await card.locator('h3').innerText()).replace(/\s+/g, ' ').trim();
      const tour = tours.find((t) => t.name === name);
      expect(tour, `card "${name}" maps to lib/tours.json`).toBeTruthy();
      await expect(card.locator('.price')).toContainText(usd(fromPrice(tour)));
    }
    await expect(page.locator('#faq details')).toHaveCount(8);
    await expect(page.locator('footer a[href="https://fhsystems.dev"]')).toBeVisible();
  });

  test('structured data: TravelAgency and FAQPage', async ({ page }) => {
    await page.goto('/');
    const types = await page.locator('script[type="application/ld+json"]').evaluateAll((els) =>
      els.map((e) => JSON.parse(e.textContent || '{}')['@type']),
    );
    expect(types).toEqual(expect.arrayContaining(['TravelAgency', 'FAQPage']));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://tours.fhsystems.dev/');
  });
});

test.describe('content rules', () => {
  test('languages are listed English, Uzbek, Russian', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.hero-langs')).toHaveText('Plan in English, Oʻzbekcha or Русский.');
    await expect(page.locator('.why-list h3').nth(1)).toHaveText('English, Oʻzbekcha, Русский');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /English, Uzbek or Russian/);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/Russian(,| or| and) Uzbek|Русский(,| or) Oʻzbekcha/);
  });

  test('every photo on the landing page is credited', async ({ page }) => {
    await page.goto('/credits');
    const credited = await page.locator('.credits .t a').evaluateAll((as) => as.map((a) => (a as HTMLAnchorElement).href));
    const credits = (await import('../src/data/photo-credits.json', { with: { type: 'json' } })).default as { slug: string; source: string }[];
    expect(credited).toHaveLength(credits.length);
    await page.goto('/');
    const html = await page.content();
    const used = [...new Set([...html.matchAll(/\/_astro\/([a-z0-9-]+)\.[A-Za-z0-9_-]+\.(?:avif|webp|jpg)/g)].map((m) => m[1]))];
    expect(used.length).toBeGreaterThan(10);
    for (const slug of used) expect(credits.map((c) => c.slug), `${slug} has a credit`).toContain(slug);
    expect(html).toContain('kalon-minaret-night');
  });
});

test.describe('handoff to the planner', () => {
  test('hero submit opens /plan and delivers the question', async ({ page }) => {
    await stubPlanner(page);
    await page.goto('/');
    const q = 'Two of us in May, we love mountains';
    await page.getByPlaceholder('Where would you like to go, and when?').fill(q);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/plan$/); // query is cleaned so a reload never resends
    await expect(plannerText(page)).toHaveText(q);
    await expect.poll(() => page.evaluate(() => (window as any).__handoff.state)).toBe('delivered');
    await expect(page.locator('[data-hint]')).toBeHidden();
  });

  test('chip click delivers the starter', async ({ page }) => {
    await stubPlanner(page);
    await page.goto('/');
    await page.locator('.planner .chip', { hasText: 'Do I need a visa?' }).click();
    await expect(page).toHaveURL(/\/plan$/);
    await expect(plannerText(page)).toHaveText('Do I need a visa?');
  });

  test('tour card hands over that tour', async ({ page }) => {
    await stubPlanner(page);
    await page.goto('/#tours');
    await page.locator('.tour').first().click();
    await expect(plannerText(page)).toContainText(tours[0].name);
  });

  test('falls back to a copy hint when the planner does not confirm', async ({ page }) => {
    await stubPlanner(page, { ack: false });
    await page.goto('/plan?q=' + encodeURIComponent('Family trip in April'));
    const hint = page.locator('[data-hint]');
    await expect(hint).toBeVisible({ timeout: 10_000 });
    await expect(hint).toContainText(/paste|Copy/);
    await hint.getByRole('button', { name: 'Dismiss' }).click();
    await expect(hint).toBeHidden();
  });
});

test.describe('pages', () => {
  test('/plan is full-screen and seamless', async ({ page }) => {
    await stubPlanner(page);
    await page.goto('/plan');
    const frame = page.locator('#planner');
    const box = await frame.boundingBox();
    const vp = page.viewportSize()!;
    expect(box).toMatchObject({ x: 0, y: 0, width: vp.width, height: vp.height });
    const style = await frame.evaluate((el) => { const s = getComputedStyle(el); return s.borderTopWidth + ' ' + s.borderLeftWidth; });
    expect(style).toBe('0px 0px');
    expect(await page.evaluate(() => [document.documentElement.scrollHeight <= innerHeight, document.documentElement.scrollWidth <= innerWidth])).toEqual([true, true]);
  });

  test('/about shows the four test runs', async ({ page }) => {
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    for (const v of ['48%', '76%', '44%', '100%']) await expect(page.locator('.bars')).toContainText(v);
    await expect(page.locator('footer')).toContainText('demonstration brand based on real 2026 prices');
  });

  test('404, robots and sitemap', async ({ page, request }) => {
    const r = await page.goto('/no-such-page');
    expect(r?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('nowhere');
    expect(await (await request.get('/robots.txt')).text()).toContain('Sitemap: https://tours.fhsystems.dev/sitemap.xml');
    const sm = await (await request.get('/sitemap.xml')).text();
    for (const p of ['/', '/plan', '/about']) expect(sm).toContain(`https://tours.fhsystems.dev${p === '/' ? '/' : p}</loc>`);
  });
});

test.describe('layout and copy rules', () => {
  for (const path of ['/', '/about', '/credits', '/plan']) {
    test(`no horizontal scroll and no implementation words on ${path}`, async ({ page }) => {
      await stubPlanner(page);
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);
      const text = (await page.locator('body').innerText()).toLowerCase();
      for (const word of ['agentplace', '/api/', 'iframe']) expect(text, `"${word}" visible on ${path}`).not.toContain(word);
    });
  }

  test('header stays on one line at 360px', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-360', 'mobile only');
    await page.goto('/');
    const h = await page.locator('.site-header .bar').evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeLessThanOrEqual(76);
    const cta = await page.locator('.site-header .cta').evaluate((el) => el.getBoundingClientRect().height);
    expect(cta).toBeLessThanOrEqual(46);
  });
});

test('live planner receives the hero question (LIVE=1)', async ({ page }, info) => {
  test.skip(!process.env.LIVE || info.project.name !== 'desktop', 'set LIVE=1 to hit the real planner');
  test.setTimeout(60_000);
  await page.goto('/plan?q=' + encodeURIComponent('Best time to visit?'));
  await expect.poll(() => page.evaluate(() => (window as any).__handoff.state), { timeout: 40_000 }).toBe('delivered');
});
