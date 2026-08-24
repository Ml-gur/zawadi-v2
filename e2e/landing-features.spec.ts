import { test, expect } from '@playwright/test';

test('value calculator syncs live counts from supabase', async ({ page }) => {
  const countRequests = page.waitForResponse(
    r => r.url().includes('rest/v1/scholarships') && r.url().includes('funding_type') && r.status() === 200,
    { timeout: 15000 },
  );
  await page.goto('/');
  await page.locator('#value-calculator').scrollIntoViewIfNeeded();
  await countRequests;
  await expect(page.locator('#vc-destination')).toContainText(/fully funded, open now/i, { timeout: 10000 });
  // UK default should cite its live listing count in the result panel
  await page.waitForTimeout(800);
  const statusLine = page.locator('#value-calculator [role="status"]').getByText(/backed by \d+ fully funded listing/i);
  await expect(statusLine).toBeVisible({ timeout: 5000 });
});

test('lime breakout matches the application-cycle banner design', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Start your application cycle')).toBeVisible();
  await expect(page.getByRole('button', { name: /create my free profile/i })).toBeVisible();
  await expect(page.getByText(/no application fees/i)).toBeVisible();
});

test('scholar stories animate in and show all three scholars', async ({ page }) => {
  await page.goto('/');
  const stories = page.locator('#scholar-stories');
  await stories.scrollIntoViewIfNeeded();
  for (const name of ['Amina Kouyaté', 'Chidi Nnamdi', 'Faith Muthoni']) {
    await expect(page.getByText(name)).toBeVisible();
  }
  await expect(stories.locator('figure').first()).toBeVisible();
});

test('compare works end-to-end on browse with floating bar and modal', async ({ page }) => {
  await page.goto('/scholarships/browse');
  await page.waitForSelector('[role="status"]', { timeout: 15000 });
  const firstCompare = page.getByRole('button', { name: /add to comparison|compare$/i }).first();
  await firstCompare.click({ timeout: 10000 });
  const secondCompare = page.getByRole('button', { name: /add to comparison|^compare$/i }).nth(1);
  await secondCompare.click();

  await expect(page.getByText(/2 selected for comparison/i)).toBeVisible();
  await page.getByRole('button', { name: /compare now/i }).click();
  const dialog = page.getByRole('dialog', { name: /compare selected scholarships/i });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('tbody tr').first().locator('td')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
});

test('404 page is branded editorial with working links', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByText("This page isn't on our map.")).toBeVisible();
  await page.getByRole('link', { name: 'Browse scholarships', exact: true }).click();
  await expect(page).toHaveURL(/\/scholarships\/browse/);
});

test('hero uses research-grounded copy', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/KES 31,000/)).toBeVisible();
  await expect(page.getByRole('button', { name: /find my matches/i }).first()).toBeVisible();
});
