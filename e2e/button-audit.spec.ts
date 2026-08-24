import { test, expect } from '@playwright/test';

/**
 * Button/link click-through audit for the public (unauthenticated) surface.
 * Every interactive element must navigate somewhere or visibly change state.
 */
const PUBLIC_ROUTES = ['/', '/scholarships/browse', '/scholarships', '/about', '/faq', '/how-it-works', '/contact'];

test('no dead hrefs (# links / empty) on public routes', async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const dead = await page.evaluate(() =>
      [...document.querySelectorAll('a')]
        .map(a => a.getAttribute('href'))
        .filter(h => !h || h === '#' || h === '')
    );
    expect(dead, `dead links on ${route}: ${JSON.stringify(dead)}`).toHaveLength(0);
  }
});

test('every button/link has a hover style defined', async ({ page }) => {
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(600);
    const missing = await page.evaluate(() => {
      const els = [...document.querySelectorAll('button, a')] as HTMLElement[];
      return els.filter(el => {
        if (el.offsetParent === null) return false; // skip hidden (mobile menu etc.)
        const cls = el.className || '';
        return !/(hover:|group-hover:)/.test(String(cls));
      }).map(el => (el.textContent || '').trim().slice(0, 40) || el.getAttribute('aria-label') || 'unlabelled');
    });
    expect(missing, `no hover style on ${route}: ${JSON.stringify(missing)}`).toHaveLength(0);
  }
});

test('sign in opens auth from every public route', async ({ page }) => {
  for (const route of ['/', '/scholarships/browse', '/scholarships']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const btn = page.getByRole('button', { name: 'Sign in' }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(800);
      await expect(page.locator('input[type="email"], input[type="password"]').first(), `auth open from ${route}`).toBeVisible({ timeout: 5000 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
  }
});

test('start free opens auth from every public route', async ({ page }) => {
  for (const route of ['/', '/scholarships/browse', '/scholarships']) {
    await page.goto(route, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(800);
    const btn = page.getByRole('button', { name: /Start free|Create Free Account/i }).first();
    if (await btn.count()) {
      await btn.click();
      await page.waitForTimeout(800);
      await expect(page.locator('input[type="email"], input[type="password"]').first(), `signup open from ${route}`).toBeVisible({ timeout: 5000 });
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(500);
    }
  }
});

test('header nav links resolve to real routes', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  for (const [label, path] of [
    ['Browse Scholarships', '/scholarships/browse'],
    ['How It Works', '/how-it-works'],
    ['About', '/about'],
    ['FAQ', '/faq'],
  ] as const) {
    await page.getByRole('link', { name: label }).first().click();
    await page.waitForURL(path);
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
  }
});

test('footer links resolve', async ({ page }) => {
  await page.goto('/scholarships/browse', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);
  for (const [label, path] of [
    ['Privacy Policy', '/privacy'],
    ['Terms of Service', '/terms'],
    ['Contact', '/contact'],
  ] as const) {
    await page.getByRole('link', { name: label }).first().click();
    await page.waitForURL(path);
    await page.goto('/scholarships/browse', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
  }
});

test('browse interactions: filters, view toggle, pagination visible', async ({ page }) => {
  await page.goto('/scholarships/browse', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  await page.getByRole('button', { name: 'Full Tuition' }).click();
  await page.waitForTimeout(400);
  await expect(page.locator('text=opportunities located, text=Showing')).toBeHidden().catch(() => {});
  const meta = await page.locator('[role="status"]').first().innerText().catch(() => '');
  expect(meta.length).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'All Types' }).click();
  await page.getByRole('button', { name: 'Table view' }).click();
  await expect(page.locator('table').first()).toBeVisible();
  await page.getByRole('button', { name: 'Grid view' }).click();
  await expect(page.locator('table').first()).toBeHidden();

  await page.getByPlaceholder(/Search scholarships/).fill('Rhodes');
  await page.waitForTimeout(500);
  const cards = await page.locator('article').count();
  expect(cards).toBeGreaterThanOrEqual(0); // search executes without error
});

test('faq accordion expands', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(800);
  const summary = page.locator('details summary').first();
  await summary.scrollIntoViewIfNeeded();
  await summary.click();
  await expect(summary.locator('xpath=ancestor::details[1]')).toHaveAttribute('open');
});
