import { test, expect } from '@playwright/test';

const protectedRoutes = ['/dashboard', '/vault', '/profile', '/billing', '/applications', '/essays', '/mentor'];

test.describe('route guards (logged out)', () => {
  for (const route of protectedRoutes) {
    test(`logged-out visit to ${route} does not render app content`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);
      const url = page.url();
      // Either redirected away from the protected path, or shown auth/404 UI
      if (url.replace(/\/$/, '') === route) {
        // Must not contain dashboard/workspace markers
        const bodyText = await page.locator('main').innerText().catch(() => '');
        expect(bodyText.toLowerCase()).not.toMatch(/welcome back|your matches|workspace overview/);
      } else {
        expect(url).not.toContain(route);
      }
    });
  }

  test('logged-out /admin redirects to admin login or blocks access', async ({ page }) => {
    await page.goto('/admin', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1200);
    const url = page.url();
    const bodyText = await page.locator('body').innerText();
    const blocked = !url.includes('/admin') || /login|sign in|not found|access/i.test(bodyText);
    expect(blocked).toBe(true);
  });
});
