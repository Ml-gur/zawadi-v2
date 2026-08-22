import { test, expect } from '@playwright/test';

const routes = ['/', '/scholarships/browse', '/how-it-works', '/about', '/faq', '/contact', '/privacy', '/terms'];

test.describe('visual smoke — all viewports', () => {
  for (const route of routes) {
    test(`no horizontal overflow on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(800);
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        inner: window.innerWidth,
      }));
      expect(overflow.scroll).toBeLessThanOrEqual(overflow.inner + 1);
    });

    test(`body is dark canvas on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg.replace(/\s/g, '')).toMatch(/rgb\(14,16,15\)|#0e100f/i);
    });
  }

  test('hero headline and CTA visible on landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1200);
    await expect(page.getByRole('button', { name: /start free/i }).first()).toBeVisible();
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });
});
