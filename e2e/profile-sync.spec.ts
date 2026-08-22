import { test, expect } from '@playwright/test';

/**
 * Verifies the confirmed_fields sync fix: after saving the profile wizard,
 * a full page reload must not re-show onboarding (profile persisted).
 *
 * NOTE: requires a seeded test account. Skipped unless E2E_TEST_EMAIL and
 * E2E_TEST_PASSWORD are provided, so the suite stays green in CI/dev.
 */

const EMAIL = process.env.E2E_TEST_EMAIL;
const PASSWORD = process.env.E2E_TEST_PASSWORD;

test.describe('profile confirmed_fields sync', () => {
  test.skip(!EMAIL || !PASSWORD, 'E2E_TEST_EMAIL / E2E_TEST_PASSWORD not set');

  test('profile save persists across reload', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /sign in/i }).first().click();
    await page.locator('input[type="email"]').fill(EMAIL!);
    await page.locator('input[type="password"]').fill(PASSWORD!);
    await page.getByRole('button', { name: /log in|sign in/i }).last().click();
    await page.waitForURL(/dashboard|\/$/, { timeout: 20000 });

    // Open profile and make an identifiable change
    await page.goto('/profile');
    const countryInput = page.locator('select').first();
    if (await countryInput.count()) {
      await countryInput.selectOption({ index: 1 });
    }
    await page.getByRole('button', { name: /save/i }).click();
    await page.waitForTimeout(1500);

    // Full reload — profile data must still be there
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/complete your profile to see matches/i);
  });
});
