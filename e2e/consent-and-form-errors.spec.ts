import { test, expect } from '@playwright/test';

/**
 * Consent must be a real gate, not a notice: no analytics request may leave the
 * browser until the visitor opts in, and the choice must be withdrawable.
 */
const ANALYTICS_URL = /googletagmanager\.com|google-analytics\.com|\/_vercel\/insights|vercel-insights/;

test.describe('cookie consent', () => {
  test('analytics is blocked until a choice is made, then persisted', async ({ page }) => {
    const analyticsRequests: string[] = [];
    page.on('request', (request) => {
      if (ANALYTICS_URL.test(request.url())) analyticsRequests.push(request.url());
    });

    await page.goto('/');

    const banner = page.getByRole('region', { name: 'Cookie consent' });
    await expect(banner).toBeVisible();

    // Nothing undecided may reach a third party.
    expect(analyticsRequests, 'analytics fired before consent').toHaveLength(0);
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);

    await banner.getByRole('button', { name: 'Accept all' }).click();
    await expect(banner).toBeHidden();

    const stored = await page.evaluate(() => localStorage.getItem('techsari.consent.v1'));
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored!).analytics).toBe(true);
  });

  test('the decision survives a reload and "essential only" stays off', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Essential only' })
      .click();

    const stored = await page.evaluate(() => localStorage.getItem('techsari.consent.v1'));
    expect(JSON.parse(stored!).analytics).toBe(false);

    await page.reload();
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeHidden();
    expect(await page.locator('script[src*="googletagmanager"]').count()).toBe(0);
  });

  test('the footer can re-open settings and the choice can be withdrawn', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Accept all' })
      .click();

    await page.getByRole('button', { name: 'Cookie settings' }).click();
    const banner = page.getByRole('region', { name: 'Cookie consent' });
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Essential + analytics');

    await banner.getByRole('button', { name: 'Withdraw my choice' }).click();
    expect(await page.evaluate(() => localStorage.getItem('techsari.consent.v1'))).toBeNull();

    await page.reload();
    await expect(page.getByRole('region', { name: 'Cookie consent' })).toBeVisible();
  });
});

test.describe('contact form error states', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/contact');
    await page.getByRole('region', { name: 'Cookie consent' })
      .getByRole('button', { name: 'Essential only' })
      .click();
  });

  test('empties are reported inline, announced, and focus moves to the first one', async ({ page }) => {
    await page.getByRole('button', { name: /Send Message/i }).click();

    const nameError = page.locator('#contact-name-error');
    await expect(nameError).toBeVisible();
    // Announced to assistive tech, not just shown.
    await expect(nameError).toHaveAttribute('role', 'alert');
    await expect(page.locator('#contact-name')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#contact-name')).toHaveAttribute('aria-describedby', 'contact-name-error');
    // Keyboard users land on the problem.
    await expect(page.locator('#contact-name')).toBeFocused();
  });

  test('a malformed email and a too-short message name the actual problem', async ({ page }) => {
    await page.locator('#contact-name').fill('Ada Lovelace');
    await page.locator('#contact-email').fill('not-an-email');
    await page.getByRole('button', { name: /Send Message/i }).click();
    await expect(page.locator('#contact-email-error')).toContainText('valid email');

    await page.locator('#contact-email').fill('ada@example.com');
    await page.locator('#contact-message').fill('too short');
    await page.getByRole('button', { name: /Send Message/i }).click();
    await expect(page.locator('#contact-message-error')).toContainText('minimum');
  });

  test('errors clear as soon as the field is corrected', async ({ page }) => {
    await page.getByRole('button', { name: /Send Message/i }).click();
    await expect(page.locator('#contact-name-error')).toBeVisible();

    await page.locator('#contact-name').fill('Ada Lovelace');
    await expect(page.locator('#contact-name-error')).toBeHidden();
    await expect(page.locator('#contact-name')).not.toHaveAttribute('aria-invalid', 'true');
  });
});
