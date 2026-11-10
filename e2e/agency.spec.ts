import { test, expect, type Page } from '@playwright/test';
import { stubPlanner } from './helpers';

const utm = async (page: Page, selector: string) => {
  const u = new URL((await page.locator(selector).first().getAttribute('href'))!);
  return { host: u.host, source: u.searchParams.get('utm_source'), medium: u.searchParams.get('utm_medium') };
};

test.describe('agency CTA', () => {
  for (const path of ['/', '/about', '/credits', '/no-such-page']) {
    test(`footer CTA with the footer UTM on ${path}`, async ({ page }) => {
      await page.goto(path);
      const line = page.locator('footer [data-agency-line]');
      await expect(line).toContainText('Demo by fhsystems. Want an AI agent like this for your business?');
      const btn = line.getByRole('link', { name: 'Build mine' });
      await expect(btn).toBeVisible();
      expect(await utm(page, 'footer [data-agency="footer"]')).toEqual({ host: 'fhsystems.dev', source: 'tours', medium: 'footer' });
      // The original "Built by fhsystems" link keeps working.
      await expect(page.locator('footer a[href="https://fhsystems.dev"]')).toBeVisible();
    });
  }

  test('landing section before the closing block', async ({ page }) => {
    await page.goto('/');
    const s = page.locator('#for-business');
    await expect(s.getByRole('heading', { level: 2 })).toHaveText('Want a planner like this for your business?');
    await expect(s.locator('.agency-points h3')).toHaveText([
      'Answers customers 24/7 in their language',
      'Quotes exact prices from your own price list',
      'Turns chats into booking requests',
    ]);
    await expect(s).toContainText(/clinics, rental companies, venues/);
    await expect(s.getByRole('link', { name: 'Get one for your business' })).toBeVisible();
    expect(await utm(page, '#for-business [data-agency="section"]')).toEqual({ host: 'fhsystems.dev', source: 'tours', medium: 'section' });
    await expect(s.getByRole('link', { name: 'See the case study' })).toHaveAttribute('href', '/about');
    // Directly before "Your Uzbekistan starts with a question".
    const next = await s.evaluate((el) => el.nextElementSibling?.querySelector('h2')?.textContent);
    expect(next).toBe('Your Uzbekistan starts with a question');
  });

  test('/plan demo chip links to /about and stays clear of the planner controls', async ({ page }) => {
    await stubPlanner(page);
    await page.goto('/plan');
    const chip = page.getByRole('link', { name: 'Demo by fhsystems' });
    await expect(chip).toBeVisible();
    await expect(chip).toHaveAttribute('href', '/about');
    const c = (await chip.boundingBox())!;
    const home = (await page.locator('.home').boundingBox())!;
    const vp = page.viewportSize()!;
    // The planner's composer and Speak button sit along the bottom edge; its header is centred.
    // The chip must stay in the top-left corner band, clear of the home button.
    expect(c.y + c.height).toBeLessThanOrEqual(56);
    expect(c.x + c.width).toBeLessThan(home.x - 8);
    expect(c.y + c.height).toBeLessThan(vp.height - 140);
    await expect(page.locator('#home-tip')).toHaveText('Back to home');
  });

  test('/plan chip does not overlap the live planner input (LIVE=1)', async ({ page }, info) => {
    test.skip(!process.env.LIVE || info.project.name !== 'mobile-360', 'set LIVE=1 to check the real planner at 360px');
    test.setTimeout(60_000);
    await page.goto('/plan');
    const input = page.frameLocator('#planner').locator('textarea, input[type="text"]').first();
    await expect(input).toBeVisible({ timeout: 40_000 });
    const a = (await page.getByRole('link', { name: 'Demo by fhsystems' }).boundingBox())!;
    const b = (await input.boundingBox())!;
    const overlap = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
    expect(overlap).toBe(false);
  });

  test('sticky mobile bar appears after the hero and hides at the footer', async ({ page }, info) => {
    test.skip(info.project.name !== 'mobile-360', 'mobile only');
    await page.goto('/');
    const bar = page.locator('[data-sticky-plan]');
    await expect(bar).not.toHaveClass(/is-on/);
    await page.locator('#how').scrollIntoViewIfNeeded();
    await expect(bar).toHaveClass(/is-on/);
    await expect(bar.getByRole('link', { name: 'Plan my trip' })).toBeVisible();
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await expect(bar).not.toHaveClass(/is-on/);
  });
});
