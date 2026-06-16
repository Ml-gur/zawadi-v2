import { test, expect } from '@playwright/test';

test.describe('Scholarships Page - Live Site', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/scholarships');
  });

  test('loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    page.on('pageerror', (err) => {
      errors.push(err.message);
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const relevantErrors = errors.filter(e => {
      if (e.includes('paystack') || e.includes('checkout.paystack')) return false;
      if (e.includes('403') || e.includes('Failed to load resource')) return false;
      return true;
    });
    expect(relevantErrors).toEqual([]);
  });

  test('shows guest banner', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    await expect(page.locator('text=You are viewing scholarships as a guest')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Create Free Account")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Log In")').first()).toBeVisible({ timeout: 5000 });
  });

  test('scholarship list renders data', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const deadlineBadges = page.locator('text=/days left|Varies|Deadline Passed/');
    await expect(deadlineBadges.first()).toBeVisible({ timeout: 10000 });
  });

  test('filter bar is present and interactive', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const searchInput = page.locator('input[placeholder*="search" i]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('auth flow: guest can trigger login', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    await page.locator('button:has-text("Create Free Account")').click();
    await page.waitForTimeout(2000);

    await expect(page.locator('input[type="email"]').first()).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive Design - Scholarships Page', () => {
  const breakpoints = [
    { name: 'mobile-375', width: 375, height: 812 },
    { name: 'tablet-768', width: 768, height: 1024 },
    { name: 'desktop-1280', width: 1280, height: 720 },
    { name: 'wide-1440', width: 1440, height: 900 },
  ];

  for (const bp of breakpoints) {
    test(`renders at ${bp.name} (${bp.width}x${bp.height})`, async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (err) => errors.push(err.message));

      await page.setViewportSize({ width: bp.width, height: bp.height });
      await page.goto('/scholarships');
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(5000);

      await expect(page.locator('body')).toBeVisible({ timeout: 5000 });
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (bp.width >= 768) {
        expect(overflowX).toBeLessThanOrEqual(5);
      }
      expect(errors).toEqual([]);
    });
  }
});
