import { test } from '@playwright/test';

const PAGES = [
  '/dashboard',
  '/scholarships',
  '/vault',
  '/essays',
  '/profile',
  '/billing',
  '/applications',
];

test('logged-in visual QA sweep', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(`[${page.url()}] ${m.text().slice(0, 200)}`); });
  page.on('pageerror', e => errors.push(`[${page.url()}] PAGEERROR: ${e.message.slice(0, 200)}`));

  // Login through the real UI
  await page.goto('/');
  await page.getByRole('button', { name: 'Sign in' }).first().click();
  await page.fill('input[type=email]', process.env.QA_EMAIL!);
  await page.fill('input[type=password]', process.env.QA_PASSWORD!);
  await page.getByRole('button', { name: /continue to dashboard/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 20000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: '/tmp/opencode/qa/dashboard.png', fullPage: true });

  for (const route of PAGES.slice(1)) {
    await page.goto(route);
    await page.waitForTimeout(2500);
    const name = route.replace(/\//g, '_') || 'root';
    await page.screenshot({ path: `/tmp/opencode/qa/${name}.png`, fullPage: true });
    console.log(`VISITED ${route} → title: ${await page.title()}`);
  }

  // Mobile spot-check
  const mob = page.viewportSize;
  console.log(`viewport was ${mob?.width}x${mob?.height}`);
  console.log('=== CONSOLE ERRORS ===');
  if (errors.length === 0) console.log('(none)');
  for (const e of errors.slice(0, 30)) console.log(e);
});
