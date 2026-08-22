import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const pages = ['/', '/scholarships/browse', '/how-it-works', '/about', '/faq', '/contact'];

test.describe('accessibility — axe-core', () => {
  for (const path of pages) {
    test(`${path} has no critical/serious violations`, async ({ page }) => {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();
      const blocking = results.violations.filter(v =>
        v.impact === 'critical' || v.impact === 'serious'
      );
      if (blocking.length > 0) {
        const summary = blocking.map(v =>
          `${v.id}(${v.impact}): ${v.nodes.length} nodes — ${v.nodes[0]?.target?.join(' ')}`
        ).join('\n');
        console.log(`axe violations on ${path}:\n${summary}`);
      }
      expect(blocking, `critical/serious violations on ${path}`).toHaveLength(0);
    });
  }
});
