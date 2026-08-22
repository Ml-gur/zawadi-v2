import { test, expect } from '@playwright/test';

const protectedRoutes = ['/dashboard', '/vault', '/profile', '/billing', '/applications', '/essays', '/mentor'];

test.describe('route guards (logged out)', () => {
  for (const route of protectedRoutes) {
    test(`logged-out visit to ${route} does not render app content`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);
      const { pathname } = new URL(page.url());

      if (pathname.replace(/\/$/, '') === route) {
        // Still on the protected path: must be showing 404/auth, never app content
        const bodyText = await page.locator('main').innerText().catch(() => '');
        expect(bodyText.toLowerCase()).not.toMatch(/welcome back|your matches|workspace overview|track every application/);
        expect(bodyText).toMatch(/404|log in|sign in/i);
      } else {
        // Redirected away — guard worked
        expect(pathname).not.toBe(route);
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
