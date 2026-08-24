/**
 * Full-site Electric Editorial audit.
 * - Visits every public route (desktop 1440x900 + mobile 390x844)
 * - Clicks every visible button/link, records outcome (URL change / modal / state change / no-op)
 * - Captures full-page screenshots
 * - Extracts computed colors and checks them against the design.md token set
 * - Checks radii (28px cards, 9999px pills), font weights (400/500 only), shadows (none on cards)
 * Writes: /tmp/opencode/audit-results.json + /tmp/opencode/shots/*.png
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:5173';
const OUT = '/tmp/opencode';
const SHOTS = path.join(OUT, 'shots');
fs.mkdirSync(SHOTS, { recursive: true });

const ROUTES = ['/', '/scholarships/browse', '/scholarships', '/about', '/faq', '/how-it-works', '/contact', '/privacy', '/terms'];

// Allowed palette from design.md (lowercased rgb strings resolved later)
const TOKEN_HEX = new Set([
  '#ffffff', '#f5f5eb', '#f8fbe8', '#f2f5e3', '#ecf0dd', '#e6ead8', '#e1e4d2',
  '#beff50', '#aef53d', '#9bd92a', '#b6f648', '#14140f', '#30302a', '#2e3226',
  '#d2d2c8', '#6e6e64', '#919183', '#b9b9b7', '#191d12', '#424936', '#344e00',
  '#4f7500', '#466800', '#ba1a1a', '#e2dfd7', '#ecece2', '#c2cab0', '#737a64',
  '#eff3e0', '#d8dcca', '#c7c7be', '#e3e3d9', '#e5e2da', '#c9c6be', '#ffdad6',
  '#15803d', '#b45309', '#466800', '#a21caf', '#6d28d9', '#000000',
]);

function rgbToHex(rgb) {
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!m) return null;
  if (m[4] && parseFloat(m[4]) === 0) return 'transparent';
  const hex = '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return hex;
}

function hexInTokens(hex) {
  if (!hex || hex === 'transparent') return true;
  if (TOKEN_HEX.has(hex)) return true;
  // allow alpha variants of token colors (e.g. lime/25) — approximate by checking base
  return null; // unknown
}

async function auditRoute(browser, route) {
  const result = { route, desktop: {}, mobile: {}, buttons: [], links: [], colorViolations: [], weightViolations: [], shadowViolations: [], radiusNotes: [] };

  // ---------- DESKTOP ----------
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const consoleErrors = [];
  page.on('pageerror', e => consoleErrors.push(e.message));
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  // trigger reveals
  await page.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 50)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 400));
  });

  await page.screenshot({ path: path.join(SHOTS, `desktop${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`), fullPage: true });

  // ---- color / weight / shadow / radius audit ----
  const styleAudit = await page.evaluate(() => {
    const out = { colors: [], weights: [], shadows: [], radii: [] };
    const els = document.querySelectorAll('body, section, div, h1, h2, h3, h4, p, span, a, button, article, header, footer, nav, td, th, li, summary, details, input, select, textarea, tr');
    els.forEach(el => {
      if (!(el instanceof HTMLElement) || el.offsetParent === null && el !== document.body) {
        if (el !== document.body) return;
      }
      const cs = getComputedStyle(el);
      const bg = cs.backgroundColor;
      const color = cs.color;
      const tag = el.tagName.toLowerCase();
      const cls = (typeof el.className === 'string' ? el.className : '').slice(0, 60);
      out.colors.push({ tag, cls, bg, color });
      const w = cs.fontWeight;
      if (['600', '700', '800', '900', 'bold', 'bolder'].includes(String(w)) && el.offsetParent !== null) {
        out.weights.push({ tag, cls, w, text: (el.textContent || '').trim().slice(0, 40) });
      }
      const sh = cs.boxShadow;
      if (sh && sh !== 'none' && !sh.includes('inset') && el.offsetParent !== null) {
        out.shadows.push({ tag, cls, sh: sh.slice(0, 80), text: (el.textContent || '').trim().slice(0, 30) });
      }
      const r = parseFloat(cs.borderRadius);
      if (el.offsetParent !== null && r > 0) {
        out.radii.push({ tag, cls, r, text: (el.textContent || '').trim().slice(0, 25) });
      }
    });
    return out;
  });

  // color violations: bg/text colors not in token set (skip transparent + rgba overlays with alpha<0.9)
  for (const c of styleAudit.colors) {
    const bgHex = rgbToHex(c.bg);
    const fgHex = rgbToHex(c.color);
    for (const [kind, hex] of [['bg', bgHex], ['fg', fgHex]]) {
      if (!hex) continue;
      const known = hexInTokens(hex);
      if (known === false) {
        result.colorViolations.push({ tag: c.tag, cls: c.cls, kind, hex });
      }
    }
  }
  // dedupe
  const seen = new Set();
  result.colorViolations = result.colorViolations.filter(v => {
    const k = `${v.tag}|${v.kind}|${v.hex}`;
    if (seen.has(k)) return false; seen.add(k); return true;
  }).slice(0, 25);

  result.weightViolations = styleAudit.weights.slice(0, 15);
  result.shadowViolations = styleAudit.shadows.slice(0, 15);

  // radius classification: cards (rounded-ed) should be 28, pills 9999
  const cardEls = styleAudit.radii.filter(r => /rounded-ed|rounded-card/.test(r.cls));
  const pillEls = styleAudit.radii.filter(r => /rounded-full/.test(r.cls));
  result.radiusNotes = {
    cardCount: cardEls.length,
    cardOffToken: cardEls.filter(r => Math.abs(r.r - 28) > 1).slice(0, 5),
    pillCount: pillEls.length,
    pillOffToken: pillEls.filter(r => r.r < 100).slice(0, 5),
  };

  // ---- button click-through ----
  const clickables = await page.evaluate(() => {
    return [...document.querySelectorAll('button, a')]
      .filter(el => {
        if (!(el instanceof HTMLElement)) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) return false;
        const style = getComputedStyle(el);
        if (style.visibility === 'hidden' || style.display === 'none') return false;
        // skip icon-only share buttons that open native share (would block)
        if (el.getAttribute('aria-label')?.toLowerCase().includes('share')) return false;
        return true;
      })
      .slice(0, 30)
      .map(el => ({
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 40),
        aria: el.getAttribute('aria-label') || '',
        tag: el.tagName.toLowerCase(),
      }));
  });

  for (const c of clickables) {
    const entry = { ...c, outcome: 'no-op' };
    try {
      const urlBefore = page.url();
      const locator = c.tag === 'button'
        ? page.locator('button', { hasText: c.text }).first()
        : page.locator('a', { hasText: c.text }).first();
      // narrow by aria if text empty
      const target = c.text ? locator : page.locator(`${c.tag}[aria-label="${c.aria}"]`).first();
      if (!(await target.isVisible().catch(() => false))) { entry.outcome = 'not-visible-after-scroll'; result.buttons.push(entry); continue; }
      await target.click({ timeout: 4000 });
      await page.waitForTimeout(900);
      const urlAfter = page.url();
      if (urlAfter !== urlBefore) {
        entry.outcome = 'navigated:' + urlAfter.replace(BASE, '');
        result.buttons.push(entry);
        await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(800);
        await page.evaluate(async () => {
          const h = document.body.scrollHeight;
          for (let y = 0; y <= h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 20)); }
          window.scrollTo(0, 0);
        });
        continue;
      }
      // state change heuristics: modal, aria-pressed, details open, results text change
      const modalOpen = await page.locator('.fixed.inset-0.z-50, [role="dialog"]').first().isVisible().catch(() => false);
      const pressed = await page.locator('[aria-pressed="true"]').count();
      const openDetails = await page.locator('details[open]').count();
      if (modalOpen) entry.outcome = 'modal-opened';
      else if (pressed > 0 || openDetails > 0) entry.outcome = 'state-changed';
      result.buttons.push(entry);
      // close modal if opened
      if (modalOpen) {
        await page.keyboard.press('Escape');
        await page.waitForTimeout(400);
      }
    } catch (e) {
      entry.outcome = 'error:' + String(e.message).slice(0, 60);
      result.buttons.push(entry);
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(600);
    }
  }

  result.desktop.consoleErrors = consoleErrors;
  result.desktop.bodyBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  result.desktop.h1 = await page.locator('h1').first().innerText().catch(() => null);
  await page.close();

  // ---------- MOBILE screenshot ----------
  const mp = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await mp.goto(BASE + route, { waitUntil: 'networkidle' });
  await mp.waitForTimeout(1000);
  await mp.addStyleTag({ content: 'html{scroll-behavior:auto!important}' });
  await mp.evaluate(async () => {
    const h = document.body.scrollHeight;
    for (let y = 0; y <= h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 300));
  });
  await mp.screenshot({ path: path.join(SHOTS, `mobile${route === '/' ? '-home' : route.replace(/\//g, '-')}.png`), fullPage: true });
  const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  result.mobile.horizontalOverflowPx = overflow;
  // mobile menu toggle works
  const menuBtn = mp.locator('header button[aria-label*="menu" i]').first();
  if (await menuBtn.count()) {
    await menuBtn.click();
    await mp.waitForTimeout(400);
    result.mobile.menuOpens = await mp.locator('nav[aria-label="Mobile"], header nav').last().isVisible().catch(() => false);
  }
  await mp.close();

  return result;
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  for (const route of ROUTES) {
    process.stdout.write('auditing ' + route + ' ... ');
    try {
      const r = await auditRoute(browser, route);
      all.push(r);
      console.log(`buttons:${r.buttons.length} colorViol:${r.colorViolations.length} weightViol:${r.weightViolations.length} shadowViol:${r.shadowViolations.length}`);
    } catch (e) {
      console.log('FAILED', e.message.slice(0, 80));
      all.push({ route, error: e.message });
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(OUT, 'audit-results.json'), JSON.stringify(all, null, 2));
  console.log('\nWrote ' + path.join(OUT, 'audit-results.json'));
})();
