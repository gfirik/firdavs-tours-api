import { test, expect } from '@playwright/test';
import { stubPlanner } from './helpers';

test.describe('planner pre-warm', () => {
  test('one background request after the first interaction, once per session', async ({ page }) => {
    const reqs = await stubPlanner(page);
    await page.goto('/');
    await page.waitForTimeout(2500);
    expect(reqs.fetches, 'nothing before the visitor interacts (page-load audits stay clean)').toBe(0);
    await page.mouse.move(200, 300);
    await page.mouse.move(260, 340);
    await expect.poll(() => reqs.fetches).toBe(1);
    await page.goto('/about');
    await page.mouse.move(200, 300);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(1500);
    expect(reqs.fetches, 'already warmed in this session').toBe(1);
  });

  test('/plan never pings in the background (the planner loads there anyway)', async ({ page }) => {
    const reqs = await stubPlanner(page);
    await page.goto('/plan');
    await page.mouse.move(200, 300);
    await page.waitForTimeout(1500);
    expect(reqs.fetches).toBe(0);
  });
});
