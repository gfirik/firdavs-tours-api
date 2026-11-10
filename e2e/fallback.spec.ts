import { test, expect, type Page } from '@playwright/test';
import { stubPlanner } from './helpers';

const Q = 'Two of us in May, mountains and Samarkand';

async function openDown(page: Page, q = Q) {
  await stubPlanner(page, { down: true });
  await page.clock.install();
  await page.goto('/plan' + (q ? '?q=' + encodeURIComponent(q) : ''));
  await expect(page.locator('[data-down]')).toBeHidden(); // still waiting
  await page.clock.fastForward(10_500);
  await expect(page.locator('[data-down]')).toBeVisible();
}

test.describe('planner unavailable', () => {
  test('after 10 s without the planner, /plan shows the enquiry form with the question', async ({ page }) => {
    await openDown(page);
    const down = page.locator('[data-down]');
    await expect(down.getByRole('heading', { level: 2 })).toHaveText('The planner is taking a break.');
    await expect(down).toContainText('Leave your trip details and a consultant replies within 24 hours.');
    await expect(page.getByLabel('Your trip')).toHaveValue(Q);
    await expect(down.getByRole('link', { name: 'Browse our journeys' })).toHaveAttribute('href', '/#tours');
    await expect(page.locator('#planner')).toBeHidden();
    await expect(page.locator('[data-hint]')).toBeHidden(); // no clipboard hint on an outage
    expect(await page.evaluate(() => [(window as any).__planner.state, (window as any).__handoff.state])).toEqual(['unavailable', 'failed']);
    // The demo chip and home button stay clear of the form.
    const chip = (await page.getByRole('link', { name: 'Demo by fhsystems' }).boundingBox())!;
    const title = (await down.getByRole('heading', { level: 2 }).boundingBox())!;
    expect(chip.y + chip.height).toBeLessThan(title.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test('the form posts an enquiry and shows the reference', async ({ page }) => {
    const posts: { body: any; key: string | undefined }[] = [];
    let attempt = 0;
    await page.route('**/api/requests', async (route) => {
      posts.push({ body: route.request().postDataJSON(), key: route.request().headers()['idempotency-key'] });
      if (attempt++ === 0) return route.abort('internetdisconnected');
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ok: true, request_id: 'FT-TEST42' }) });
    });
    await openDown(page);
    await page.getByLabel('Your name').fill('Ann Smith');
    await page.getByLabel('Email or Telegram').fill('ann@example.com');
    await page.getByRole('button', { name: 'Send to a consultant' }).click();
    await expect(page.getByRole('alert')).toContainText('Check your connection');
    await page.getByRole('button', { name: 'Send to a consultant' }).click();
    await expect(page.locator('[data-sent]')).toContainText('Your reference is FT-TEST42');
    await expect(page.locator('[data-sent]')).toContainText('Thank you, Ann.');
    await expect(page.locator('[data-enquiry]')).toBeHidden();
    expect(posts).toHaveLength(2);
    expect(posts[0].key).toBeTruthy();
    expect(posts[1].key).toBe(posts[0].key); // a retry can never create a duplicate request
    expect(posts[1].body).toMatchObject({ kind: 'enquiry', name: 'Ann Smith', contact: 'ann@example.com', message: Q, website: '', source: 'plan_fallback' });
  });

  test('the form checks its fields before sending', async ({ page }) => {
    let posted = 0;
    await page.route('**/api/requests', (route) => { posted++; return route.fulfill({ status: 201, body: '{}' }); });
    await openDown(page, '');
    await page.getByLabel('Your name').fill('Ann');
    await page.getByLabel('Email or Telegram').fill('not a contact');
    await page.getByRole('button', { name: 'Send to a consultant' }).click();
    await expect(page.getByRole('alert')).toHaveText('Please add an email address or a Telegram @username.');
    await expect(page.getByLabel('Email or Telegram')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel('Email or Telegram').fill('@ann_travel');
    await page.getByRole('button', { name: 'Send to a consultant' }).click();
    await expect(page.getByRole('alert')).toHaveText('Please tell us a little about your trip.');
    expect(posted).toBe(0);
  });

  test('a planner that answers never shows the fallback', async ({ page }) => {
    await stubPlanner(page);
    await page.clock.install();
    await page.goto('/plan');
    await expect.poll(() => page.evaluate(() => (window as any).__planner.state)).toBe('ready');
    await page.clock.fastForward(15_000);
    await expect(page.locator('[data-down]')).toBeHidden();
    await expect(page.locator('#planner')).toBeVisible();
  });

  test('"Try the planner again" reloads it and switches over when it answers', async ({ page }) => {
    await openDown(page);
    await page.unroute('**ig63smceaks7.run.agentplace.io/**');
    await stubPlanner(page);
    await page.getByRole('button', { name: 'Try the planner again' }).click();
    await expect(page.locator('#planner')).toBeVisible();
    await expect(page.locator('[data-down]')).toBeHidden();
  });

  test('a planner that comes back late takes over, unless the visitor is mid-form', async ({ page }) => {
    await openDown(page);
    await page.unroute('**ig63smceaks7.run.agentplace.io/**');
    await stubPlanner(page);
    await page.getByLabel('Your name').fill('Ann');
    await page.evaluate(() => { const f = document.getElementById('planner') as HTMLIFrameElement; f.src = f.src; });
    const back = page.locator('[data-back]');
    await expect(back).toContainText('The planner is back.');
    await expect(page.locator('[data-down]')).toBeVisible(); // the half-filled form is not taken away
    await back.getByRole('button', { name: 'Open the planner' }).click();
    await expect(page.locator('#planner')).toBeVisible();
    await expect(page.locator('[data-down]')).toBeHidden();
  });
});
