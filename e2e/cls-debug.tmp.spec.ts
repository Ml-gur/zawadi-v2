import { test } from '@playwright/test';

test('identify layout-shift sources on landing', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://localhost:4174/', { waitUntil: 'load' });
  await page.waitForTimeout(3000);

  const shifts = await page.evaluate(() => new Promise<Array<Record<string, unknown>>>(resolve => {
    const found: Array<Record<string, unknown>> = [];
    const po = new PerformanceObserver(list => {
      for (const e of list.getEntries() as unknown as Array<LayoutShift & { sources?: Array<{ node?: Element }> }>) {
        if ((e as any).hadRecentInput) continue;
        const sources = (e.sources || []).map(s => {
          const n = s.node as HTMLElement | undefined;
          return n ? `${n.tagName.toLowerCase()}.${String(n.className).slice(0, 60)}` : 'unknown';
        });
        found.push({ value: Math.round(e.value * 1000) / 1000, time: Math.round(e.startTime), sources: sources.slice(0, 3) });
      }
    });
    try { po.observe({ type: 'layout-shift', buffered: true } as PerformanceObserverInit); } catch { /* noop */ }
    setTimeout(() => resolve(found), 1200);
  }));

  const total = shifts.reduce((a: number, s) => a + (s.value as number), 0);
  console.log(`TOTAL CLS: ${Math.round(total * 1000) / 1000}`);
  for (const s of shifts.sort((a, b) => (b.value as number) - (a.value as number)).slice(0, 10)) {
    console.log(`shift=${s.value} @${s.time}ms  ← ${JSON.stringify(s.sources)}`);
  }
});
