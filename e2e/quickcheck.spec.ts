import { test, expect } from '@playwright/test';

test('quick check returns a real match count, never the generic error', async ({ page }) => {
  const badResponses: number[] = [];
  page.on('response', res => {
    if (res.url().includes('/rest/v1/scholarships') && res.status() >= 400) badResponses.push(res.status());
  });

  await page.goto('/');
  const qc = page.locator('#instant-check');
  await qc.scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /calculate my eligible grants/i }).click();

  await expect(qc.locator('[aria-live] .bg-electric-lime')).toBeVisible({ timeout: 15000 });
  await expect(qc.getByText(/could not be loaded/i)).toHaveCount(0);
  expect(badResponses, `expected no 4xx/5xx from supabase, got ${badResponses.join(',')}`).toHaveLength(0);
});
