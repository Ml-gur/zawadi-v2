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

    const paystackErrors = errors.filter(e => e.includes('paystack') || e.includes('checkout.paystack'));
    const reactErrors = errors.filter(e => !e.includes('paystack') && !e.includes('checkout.paystack'));
    expect(reactErrors).toEqual([]);
  });

  test('shows guest banner', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    await expect(page.locator('text=You are viewing scholarships as a guest')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Create Free Account")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('button:has-text("Log In")')).toBeVisible({ timeout: 5000 });
  });

  test('scholarship list renders data', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(5000);

    const scholarshipCards = page.locator('[class*="scholarship"]').or(page.locator('[class*="card"]'));
    const count = await scholarshipCards.count();
    expect(count).toBeGreaterThan(0);
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
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(bp.width + 5);
      expect(errors).toEqual([]);
    });
  }
});
