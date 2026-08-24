import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

const BASE = 'http://localhost:4199';
const browser = await chromium.launch();

async function measure(page, path, label) {
  await page.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4500);
  const metrics = await page.evaluate(() => new Promise(resolve => {
    const po = new PerformanceObserver(list => {});
    po.disconnect();
    const nav = performance.getEntriesByType('navigation')[0];
    const paints = performance.getEntriesByType('paint');
    const fcp = paints.find(p => p.name === 'first-contentful-paint');
    const clsEntries = performance.getEntriesByType('layout-shift');
    let cls = 0;
    clsEntries.forEach(e => { if (!e.hadRecentInput) cls += e.value; });
    resolve({
      ttfb: Math.round(nav.responseStart),
      domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
      fcp: fcp ? Math.round(fcp.startTime) : null,
      cls: +cls.toFixed(4),
      transferKB: Math.round(nav.transferSize / 1024),
    });
  }));
  console.log(`[${label}]`, JSON.stringify(metrics));
  return metrics;
}

// Desktop
const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const dp = await desktop.newPage();
await measure(dp, '/', 'desktop /');
await measure(dp, '/scholarships/browse', 'desktop /browse');

// LCP via web-vitals-ish: largest contentful paint entry
await dp.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
await dp.waitForTimeout(4500);
const lcp = await dp.evaluate(() => new Promise(resolve => {
  let last = 0;
  new PerformanceObserver(l => { last = l.getEntries().at(-1)?.startTime || 0; })
    .observe({ type: 'largest-contentful-paint', buffered: true });
  setTimeout(() => resolve(Math.round(last)), 1500);
}));
console.log('[desktop /] LCP:', lcp, 'ms');

// Mobile
const mobile = await browser.newContext({
  viewport: { width: 390, height: 844 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  isMobile: true, hasTouch: true, deviceScaleFactor: 3,
});
const mp = await mobile.newPage();
await measure(mp, '/', 'mobile /');
await measure(mp, '/scholarships/browse', 'mobile /browse');
await measure(mp, '/faq', 'mobile /faq');

// Horizontal overflow check on mobile
for (const path of ['/', '/scholarships/browse', '/about', '/faq', '/how-it-works', '/privacy']) {
  await mp.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(3000);
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  console.log(`[mobile ${path}] horizontal overflow: ${overflow}px`);
}

// Tap target spot-check on mobile browse
await mp.goto(BASE + '/scholarships/browse', { waitUntil: 'domcontentloaded' });
await mp.waitForTimeout(3500);
const smallTargets = await mp.evaluate(() => {
  const bad = [];
  document.querySelectorAll('button, a').forEach(el => {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && (r.width < 40 || r.height < 40) && !el.closest('nav[aria-label="Breadcrumb"]')) {
      bad.push(`${el.tagName}.${(el.className || '').toString().slice(0, 40)} ${Math.round(r.width)}x${Math.round(r.height)}`);
    }
  });
  return bad.slice(0, 8);
});
console.log('[mobile /browse] sub-40px tap targets:', JSON.stringify(smallTargets, null, 1));

// Axe on mobile for the key public pages
for (const path of ['/', '/scholarships/browse', '/faq']) {
  await mp.goto(BASE + path, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(3500);
  const results = await new AxeBuilder({ page: mp }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const viols = results.violations.map(v => `${v.id}(${v.nodes.length})`);
  console.log(`[axe mobile ${path}]`, viols.length ? viols.join(', ') : 'CLEAN');
}

await browser.close();
