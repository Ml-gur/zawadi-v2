import { test } from '@playwright/test';

test('mobile performance audit — production build', async ({ page }) => {
  const resources: Array<{ type: string; kb: number; url: string }> = [];
  page.on('response', async res => {
    try {
      const headers = res.headers();
      const size = Number(headers['content-length'] || 0);
      const type = headers['content-type']?.split(';')[0] || 'other';
      resources.push({ type, kb: Math.round(size / 1024), url: res.url().split('?')[0] });
    } catch { /* ignore */ }
  });

  await page.setViewportSize({ width: 390, height: 844 }); // iPhone-ish mobile
  const start = Date.now();
  await page.goto(process.env.PERF_URL || 'http://localhost:4174/', { waitUntil: 'load' });
  const loadMs = Date.now() - start;

  const timings = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');
    const fcp = paint.find(p => p.name === 'first-contentful-paint');
    // LCP via observer buffer
    return {
      ttfb: Math.round(nav.responseStart - nav.requestStart),
      domInteractive: Math.round(nav.domInteractive - nav.startTime),
      domComplete: Math.round(nav.domComplete - nav.startTime),
      loadEvent: Math.round(nav.loadEventEnd - nav.startTime),
      fcp: fcp ? Math.round(fcp.startTime) : null,
    };
  });

  // Wait for LCP stabilization then measure via JS
  await page.waitForTimeout(2500);
  const lcp = await page.evaluate(() => new Promise<number>(resolve => {
    const po = new PerformanceObserver(list => {
      const entries = list.getEntries();
      if (entries.length) resolve(Math.round(entries[entries.length - 1].startTime));
    });
    try { po.observe({ type: 'largest-contentful-paint', buffered: true } as PerformanceObserverInit); }
    catch { resolve(-1); }
    setTimeout(() => resolve(-1), 1500);
  }));

  // CLS
  const cls = await page.evaluate(() => new Promise<number>(resolve => {
    let total = 0;
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries()) { if (!(e as any).hadRecentInput) total += (e as any).value; }
    });
    try { po.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit); }
    catch { resolve(-1); }
    setTimeout(() => resolve(Math.round(total * 1000) / 1000), 800);
  }));

  const totalKB = resources.reduce((a, r) => a + r.kb, 0);
  const byType = resources.reduce<Record<string, number>>((acc, r) => { acc[r.type] = (acc[r.type] || 0) + r.kb; return acc; }, {});
  const top = [...resources].sort((a, b) => b.kb - a.kb).slice(0, 8);

  console.log('=== MOBILE PERF (production build) ===');
  console.log(`TTFB ${timings.ttfb}ms | FCP ${timings.fcp}ms | LCP ${lcp}ms | CLS ${cls} | domInteractive ${timings.domInteractive}ms | load ${loadMs}ms`);
  console.log(`Total payload: ${Math.round(totalKB / 1024)}MB`);
  console.log('By type:', JSON.stringify(byType));
  console.log('Heaviest resources:');
  for (const r of top) console.log(`  ${String(r.kb).padStart(5)}KB  ${r.type.padEnd(24)} ${r.url.slice(-70)}`);
});
