import { test, expect } from '@playwright/test';

const routes = ['/', '/scholarships/browse', '/how-it-works', '/about', '/faq', '/contact', '/privacy', '/terms'];
const darkRoutes = routes.filter(r => r !== '/' && r !== '/scholarships/browse');
const lightPages: Array<[string, string]> = [
  ['/', '#landing-root'],
  ['/scholarships/browse', '#browse-root'],
];

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
  }

  // The whole site is now the light Electric Editorial canvas.
  for (const route of darkRoutes) {
    test(`body is light canvas on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg.replace(/\s/g, '')).toMatch(/rgb\(248,251,232\)|#f8fbe8/i);
    });
  }

  for (const [route, rootId] of lightPages) {
    test(`body is light editorial canvas on ${route}`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.locator(rootId).waitFor({ state: 'attached', timeout: 15000 });
      const bg = await page.evaluate(sel => {
        const el = document.querySelector(sel) as HTMLElement | null;
        return el ? getComputedStyle(el).backgroundColor : '';
      }, rootId);
      expect(bg.replace(/\s/g, '')).toMatch(/rgb\(255,\s?255,\s?255\)|rgb\(245,\s?245,\s?235\)|#fff|#f5f5eb/i);
    });
  }

  test('hero headline and CTA visible on landing', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1200);
    await expect(page.getByRole('button', { name: /find my matches/i }).first()).toBeVisible();
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();
    const box = await h1.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.y).toBeGreaterThanOrEqual(0);
  });
});
