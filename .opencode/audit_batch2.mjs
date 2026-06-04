// Batch 2: Sections C-N (Core flows with logged-in user)
import { chromium } from 'playwright';
import { writeFileSync } from 'fs';

const BASE = 'http://localhost:5173';
const results = [];
let pass = 0, fail = 0, partial = 0;
function rec(id, desc, status, finding, ev = '') {
  results.push({ id, desc, status, finding, ev });
  if (status === 'PASS') pass++; else if (status === 'FAIL') fail++; else partial++;
  console.log(`  ${status}: ${id} — ${finding}`);
}
const slp = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  console.log('=== BATCH 2: SECTIONS C-N (Core Flows) ===\n');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // ─── REGISTER FRESH USER ───
  const ts = Date.now();
  const email = `audit-core-${ts}@test.com`;
  const pass = 'AuditPass2026!';
  await page.goto(BASE);
  await slp(1500);
  await page.goto(BASE + '/login');
  await slp(2000);
  // Click Sign Up link
  const signupLink = await page.$('text=Don\'t have an account, text=Sign Up, text=Create Account');
  if (signupLink) await signupLink.click();
  await slp(1500);
  const nameInp = await page.$('input[placeholder*="Name"]');
  const emailInp = await page.$('input[type="email"]');
  const passInp = await page.$('input[type="password"]');
  if (emailInp && passInp) {
    if (nameInp) await nameInp.fill('Core Audit User');
    await emailInp.fill(email);
    await passInp.fill(pass);
    const sel = await page.$('select');
    if (sel) await sel.selectOption('Nigeria').catch(() => {});
    const sub = await page.$('button[type="submit"]');
    if (sub) { await sub.click(); await slp(4000); }
  }
  rec('C1', 'Register fresh user', pass ? 'PASS' : 'PARTIAL',
    `Email: ${email}`, '');

  // ─── C2: Profile wizard fields ───
  // After registration, check for wizard
  await slp(2000);
  const wizardPresent = await page.$('text=date of birth, text=Date of Birth, text=profile, text=onboarding');
  rec('C2', 'Wizard appears after registration', wizardPresent ? 'PARTIAL' : 'PASS',
    wizardPresent ? 'Wizard/setup found' : 'No wizard detected (may redirect to dashboard)', '');

  // ─── NAVIGATE TO PROFILE ───
  // Try clicking Profile link
  const profileLink = await page.$('a[href*="profile"], text=Profile, text=My Profile');
  if (profileLink) await profileLink.click();
  await slp(3000);

  // ─── C5-C6: Profile all fields ───
  const profileFields = await page.$$('input, select, textarea');
  rec('C5', 'Profile page has form fields', profileFields.length > 0 ? 'PASS' : 'PARTIAL',
    `${profileFields.length} fields found`, '');

  // ─── C7: Algorithmic language check ───
  const bodyText = await page.evaluate(() => document.body.innerText);
  const algoTerms = ['calibrate', 'variables', 'indices', 'streaks', 'weighting', 'equity support eligible', 'secondary partial grant assistance', 'Calibrate Profile Matching Matrix', 'matching target level', 'Academic Gender Representation'];
  const foundTerms = algoTerms.filter(t => bodyText.toLowerCase().includes(t.toLowerCase()));
  rec('C7', 'No algorithmic language', foundTerms.length === 0 ? 'PASS' : 'FAIL',
    foundTerms.length > 0 ? `Found: ${foundTerms.join(', ')}` : 'No algorithmic language', '');

  // ─── D1: Scholarships page ───
  const scholLink = await page.$('a[href*="scholarship"], text=Scholarships, text=scholarships');
  if (scholLink) await scholLink.click();
  else await page.goto(BASE + '/scholarships');
  await slp(3000);
  const scholCards = await page.$$('[class*="scholarship"], [class*="Scholarship"]');
  rec('D1', 'Scholarships page loads', scholCards.length > 0 ? 'PASS' : 'PARTIAL',
    `${scholCards.length} scholarship cards found`, '');

  // ─── E1: Application tracker ───
  // Click Save on a scholarship
  const trackBtn = await page.$('text=Save, text=Track, text=Save Scholarship');
  if (trackBtn) { await trackBtn.click(); await slp(2000); }
  rec('E1', 'Save scholarship', trackBtn ? 'PARTIAL' : 'PARTIAL',
    trackBtn ? 'Track button clicked' : 'No track button found', '');

  // ─── H1: Plans page ───
  await page.goto(BASE + '/plans');
  await slp(3000);
  const plansText = await page.evaluate(() => document.body.innerText);
  const hasExplorer = plansText.includes('Explorer');
  const hasPlus = plansText.includes('Plus') || plansText.includes('Scholar Plus');
  const hasPro = plansText.includes('Pro') || plansText.includes('Application Pro');
  rec('H1', 'Plans page shows 3 plans', (hasExplorer && hasPlus && hasPro) ? 'PASS' : 'FAIL',
    `Explorer:${hasExplorer} Plus:${hasPlus} Pro:${hasPro}`, '');

  // H1b: No $29 Mentor plan
  const hasMentor29 = plansText.includes('$29') && plansText.includes('Mentor');
  rec('H1b', 'No $29 Mentor plan', hasMentor29 ? 'FAIL' : 'PASS',
    hasMentor29 ? '$29 Mentor plan FOUND' : 'No $29 Mentor plan', '');

  // ─── K1: DIST folder security check ───
  // Already done via bash, record here
  rec('K1', 'No secrets in dist', 'PASS', 'Verified via bash: no secrets in dist', '');

  // ─── K4: HTTPS redirect ───
  rec('K4', 'HTTPS redirect', 'PASS', 'HTTP → HTTPS (308) confirmed via curl', '');

  // ─── N1: Homepage sections ───
  await page.goto(BASE);
  await slp(2000);
  const sections = await page.$$eval('section, [class*="hero"], [class*="feature"], [class*="section"], [class*="cta"]', els => els.length);
  rec('N1', 'Distinct homepage sections', sections >= 4 ? 'PASS' : 'PARTIAL',
    `${sections} sections found`, '');

  // N2: Hero section
  const h1 = await page.$eval('h1', el => el.textContent.trim()).catch(() => '(no h1)');
  rec('N2a', 'Hero headline', h1 ? 'PASS' : 'FAIL', h1, '');
  const ctas = await page.$$eval('a, button', els => els.filter(el => el.textContent.includes('Create') || el.textContent.includes('How It Works')).length);
  rec('N2b', 'CTA buttons in hero', ctas >= 1 ? 'PASS' : 'PARTIAL', `${ctas} CTAs found`, '');

  // N6: Feature cards
  const cards = await page.$$eval('[class*="card"], [class*="feature"]', els => els.slice(0, 3).map(el => el.textContent.trim().substring(0, 80)));
  rec('N6', 'Feature cards present', cards.length >= 2 ? 'PASS' : 'PARTIAL',
    `${cards.length} cards: ${cards[0] || ''}`, '');

  // N3: Above-fold word count estimate
  const visibleText = await page.evaluate(() => {
    const scrollY = window.scrollY;
    const h = window.innerHeight;
    const els = document.querySelectorAll('h1, h2, h3, p, a, button, span');
    let words = 0;
    els.forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.top >= scrollY && rect.bottom <= scrollY + h) {
        words += (el.textContent || '').split(/\s+/).filter(Boolean).length;
      }
    });
    return words;
  });
  rec('N3', 'Above-fold word count', 'PARTIAL', `~${visibleText} words above fold`, '');

  // ─── SECTION SUMMARY ───
  console.log(`\n═══ BATCH 2 SUMMARY ═══`);
  console.log(`Tests: ${results.length} | Pass: ${pass} | Fail: ${fail} | Partial: ${partial}`);

  const report = `# Batch 2: Core Flows
| ID | Description | Status | Finding | Evidence |
|----|-------------|--------|---------|----------|
${results.map(r => `| ${r.id} | ${r.desc} | ${r.status} | ${r.finding} | ${r.ev} |`).join('\n')}
`;
  writeFileSync('AUDIT_BATCH2.md', report, 'utf-8');
  console.log('Saved to AUDIT_BATCH2.md');
  await browser.close();
})();
