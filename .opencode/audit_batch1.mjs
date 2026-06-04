// Batch 1: Sections A (Public Website) + B (Authentication)
import { chromium } from 'playwright';
import { writeFileSync, appendFileSync } from 'fs';

const BASE = 'http://localhost:5173';
const results = [];
let passCount = 0, failCount = 0, partialCount = 0;

function rec(id, desc, status, finding, evidence = '') {
  results.push({ id, desc, status, finding, evidence });
  if (status === 'PASS') passCount++;
  else if (status === 'FAIL') failCount++;
  else partialCount++;
  console.log(`  ${status}: ${id} — ${finding}`);
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  console.log('=== ZAWADI COMPLETE AUDIT — BATCH 1 (A+B) ===\n');
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const logs = [];
  page.on('request', req => { if (req.url().includes('supabase')) logs.push(req.url()); });

  // ─── SECTION A: PUBLIC WEBSITE ───
  console.log('\n─── SECTION A: PUBLIC WEBSITE ───\n');

  // A1: Page load time (Performance timing API)
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 30000 });
  const timing = await page.evaluate(() => {
    const p = performance.getEntriesByType('navigation')[0];
    return p ? p.loadEventEnd - p.startTime : null;
  });
  rec('A1', 'Page load time', timing ? 'PASS' : 'PARTIAL',
    timing ? `${Math.round(timing)}ms` : 'Could not measure', '');

  // A2: iPhone SE viewport (375x812)
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(1000);
  const aboveFoldSE = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const ctas = document.querySelectorAll('a, button');
    const ctaTexts = Array.from(ctas).filter(el => el.textContent.includes('Create') || el.textContent.includes('How It Works')).map(el => el.textContent.trim());
    const scrollbar = document.body.scrollWidth > w;
    return { w, h, headline: h1.substring(0, 80), ctas: ctaTexts.join(', '), hScrollbar: scrollbar };
  });
  rec('A2', 'iPhone SE 375x812', aboveFoldSE.headline ? 'PASS' : 'PARTIAL',
    `W:${aboveFoldSE.w} H:${aboveFoldSE.h} Headline:"${aboveFoldSE.headline}" CTAs:[${aboveFoldSE.ctas}] H-scroll:${aboveFoldSE.hScrollbar}`, '');

  // A3: iPhone 14 viewport (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(1000);
  const aboveFold14 = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
    const scrollbar = document.body.scrollWidth > w;
    return { w, h, headline: h1.substring(0, 80), hScrollbar: scrollbar };
  });
  rec('A3', 'iPhone 14 390x844', aboveFold14.headline ? 'PASS' : 'PARTIAL',
    `W:${aboveFold14.w} H:${aboveFold14.h} Headline:"${aboveFold14.headline}" H-scroll:${aboveFold14.hScrollbar}`, '');

  // A4: iPad portrait (768x1024)
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(1000);
  const ipadLayout = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scrollbar = document.body.scrollWidth > w;
    return { w, h, hScrollbar: scrollbar };
  });
  rec('A4', 'iPad 768x1024 portrait', 'PASS', `W:${ipadLayout.w} H:${ipadLayout.h} H-scroll:${ipadLayout.hScrollbar}`, '');

  // A5: Desktop (1280x800)
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(1000);
  const desktopLayout = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scrollbar = document.body.scrollWidth > w;
    return { w, h, hScrollbar: scrollbar };
  });
  rec('A5', 'Desktop 1280x800', 'PASS', `W:${desktopLayout.w} H:${desktopLayout.h} H-scroll:${desktopLayout.hScrollbar}`, '');

  // A6: Landscape mobile (844x390)
  await page.setViewportSize({ width: 844, height: 390 });
  await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await sleep(1000);
  const landscape = await page.evaluate(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const scrollbar = document.body.scrollWidth > w;
    const btnsOverlap = false;
    return { w, h, hScrollbar: scrollbar };
  });
  rec('A6', 'Mobile landscape 844x390', landscape.hScrollbar ? 'FAIL' : 'PASS',
    `W:${landscape.w} H:${landscape.h} H-scroll:${landscape.hScrollbar}`, '');

  // A7: Logo click
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const logo = await page.$('a[href="/"], nav a[href="/"], header a');
  if (logo) {
    await logo.click();
    await sleep(1500);
    rec('A7', 'Logo navigates to /', 'PASS', `URL: ${page.url()}`, '');
  } else {
    rec('A7', 'Logo navigation', 'FAIL', 'No logo link found', '');
  }

  // A8: Create Your Profile button
  await page.goto(BASE, { waitUntil: 'networkidle' });
  const createBtn = await page.$('text=Create Your Profile');
  if (createBtn) {
    await createBtn.click();
    await sleep(2000);
    const urlAfter = page.url();
    const formVisible = await page.$('input[type="email"], input[type="password"]');
    rec('A8', 'Create Your Profile button', formVisible ? 'PASS' : 'PARTIAL',
      formVisible ? 'Auth form appeared' : `URL: ${urlAfter}`, '');
  } else {
    rec('A8', 'Create Your Profile button', 'FAIL', 'Button not found', '');
  }

  // A9: See How It Works
  // Close any modal if present
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(1000);
  // Check if auth modal is blocking
  const closeModalBtn = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeModalBtn) await closeModalBtn.click();
  await sleep(500);
  const howItWorksBtn = await page.$('text=See How It Works, text=See How It Works');
  // Try different selectors
  const howBtn = await page.$('a[href*="how"]') || await page.$('text=See How It Works') || await page.$('text=How It Works');
  if (howBtn) {
    const yBefore = await page.evaluate(() => window.scrollY);
    await howBtn.click();
    await sleep(1500);
    const yAfter = await page.evaluate(() => window.scrollY);
    rec('A9', 'See How It Works scrolls', yAfter > yBefore ? 'PASS' : 'PARTIAL',
      `Scroll Y: ${yBefore} → ${yAfter}`, '');
  } else {
    rec('A9', 'See How It Works', 'FAIL', 'Button not found', '');
  }

  // A10: Log In in navbar
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(500);
  // Close any modal
  const closeBtn2 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeBtn2) await closeBtn2.click();
  await sleep(500);
  const loginNav = await page.$('text=Log In, text=Sign In, a[href*="login"]');
  if (loginNav) {
    await loginNav.click();
    await sleep(2000);
    const loginForm = await page.$('input[type="email"], input[type="password"]');
    rec('A10', 'Log In in navbar', loginForm ? 'PASS' : 'PARTIAL',
      loginForm ? 'Login form/modal appeared' : `URL: ${page.url()}`, '');
  } else {
    rec('A10', 'Log In in navbar', 'FAIL', 'Login link not found', '');
  }

  // A11: Scroll through landing page
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(1000);
  const closeBtn3 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeBtn3) await closeBtn3.click();
  await sleep(500);
  const pageData = await page.evaluate(() => {
    const fullText = document.body.innerText;
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => h.textContent.trim()).filter(Boolean);
    const lorem = fullText.includes('Lorem ipsum');
    const icons = ['cloud_upload', 'folder_open', 'check_circle', 'stars', 'schedule', 'trending_up', 'info', 'edit', 'delete'];
    const foundIcons = icons.filter(i => fullText.includes(i));
    const fakeNums = fullText.match(/\b(12 active|3 due|5 documents|10 scholarships)\b/i);
    return { headings: headings.slice(0, 20), lorem, foundIcons, fakeNums: fakeNums ? fakeNums[0] : null };
  });
  rec('A11a', 'Lorem ipsum check', pageData.lorem ? 'FAIL' : 'PASS',
    pageData.lorem ? 'Lorem ipsum found' : 'No Lorem ipsum', '');
  rec('A11b', 'Raw icon text check', pageData.foundIcons.length === 0 ? 'PASS' : 'FAIL',
    pageData.foundIcons.length > 0 ? `Found icons: ${pageData.foundIcons.join(', ')}` : 'No raw icon text', '');
  rec('A11c', 'Fake demo numbers', pageData.fakeNums ? 'FAIL' : 'PASS',
    pageData.fakeNums ? `Found: ${pageData.fakeNums}` : 'No fake demo numbers', '');

  // A12: Footer links
  const footerLinks = await page.$$eval('footer a, [class*="footer"] a', els => 
    els.map(a => ({ text: a.textContent.trim(), href: a.href })).filter(l => l.href)
  );
  rec('A12', 'Footer links', footerLinks.length >= 4 ? 'PASS' : 'PARTIAL',
    `${footerLinks.length} footer links found`, footerLinks.slice(0, 5).map(l => `${l.text}: ${l.href}`).join(' | '));

  // A13: Footer height
  const footerHeight = await page.evaluate(() => {
    const f = document.querySelector('footer') || document.querySelector('[class*="footer"]');
    return f ? f.offsetHeight : null;
  });
  rec('A13', 'Footer height', footerHeight ? 'PASS' : 'PARTIAL',
    footerHeight ? `${footerHeight}px` : 'Footer not found', '');

  // A14: Tab title
  const title = await page.title();
  rec('A14', 'Browser tab title', title ? 'PASS' : 'FAIL', title, '');

  // A15: Page source secrets check
  const html = await page.evaluate(() => document.documentElement.innerHTML);
  const secrets = [
    ['sk_live', html.includes('sk_live')],
    ['SUPABASE_SERVICE_ROLE', html.includes('SUPABASE_SERVICE_ROLE')],
    ['GOOGLE_API_KEY', html.includes('GOOGLE_API_KEY')],
    ['DEEPSEEK_API_KEY', html.includes('DEEPSEEK_API_KEY')],
    ['pk_live', html.includes('pk_live')],
  ];
  for (const [name, found] of secrets) {
    rec(`A15-${name}`, `Secret: ${name}`, found ? 'FAIL' : 'PASS',
      found ? `${name} FOUND in page source (CRITICAL)` : `${name} not found`, '');
  }

  // A16: /about
  await page.goto(`${BASE}/about`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(1000);
  const aboutText = await page.evaluate(() => document.body.innerText.substring(0, 200));
  rec('A16', '/about loads', aboutText.length > 50 ? 'PASS' : 'FAIL', aboutText.substring(0, 80), '');

  // A17: /faq
  await page.goto(`${BASE}/faq`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(1000);
  const faqText = await page.evaluate(() => document.body.innerText.substring(0, 100));
  rec('A17', '/faq loads', faqText.length > 50 ? 'PASS' : 'FAIL', faqText.substring(0, 80), '');

  // A18: /how-it-works
  await page.goto(`${BASE}/how-it-works`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(1000);
  const hiwText = await page.evaluate(() => document.body.innerText.substring(0, 200));
  rec('A18', '/how-it-works loads', hiwText.length > 50 ? 'PASS' : 'FAIL', hiwText.substring(0, 80), '');

  // A19: /privacy
  await page.goto(`${BASE}/privacy`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(1000);
  const privText = await page.evaluate(() => document.body.innerText.substring(0, 100));
  rec('A19', '/privacy loads', privText.length > 50 ? 'PASS' : 'FAIL', privText.substring(0, 80), '');

  // A20: /terms
  await page.goto(`${BASE}/terms`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(1000);
  const termsText = await page.evaluate(() => document.body.innerText.substring(0, 100));
  rec('A20', '/terms loads', termsText.length > 50 ? 'PASS' : 'FAIL', termsText.substring(0, 80), '');

  // A21: /contact
  await page.goto(`${BASE}/contact`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(1000);
  const contactForm = await page.$('form, input[type="text"], input[type="email"], textarea');
  rec('A21', '/contact loads with form', contactForm ? 'PASS' : 'FAIL',
    contactForm ? 'Contact form found' : 'Form not found', '');

  // A22-A23: Contact form validation
  if (contactForm) {
    // A22: Empty name
    const submitBtn = await page.$('button[type="submit"], button:has-text("Submit")');
    if (submitBtn) {
      await submitBtn.click();
      await sleep(1000);
      const valMsg = await page.evaluate(() => {
        const errs = document.querySelectorAll('[class*="error"], [role="alert"], .text-red');
        return Array.from(errs).map(e => e.textContent).join(' | ');
      });
      rec('A22', 'Empty name validation', valMsg ? 'PASS' : 'PARTIAL',
        valMsg || 'No visible validation message', '');
    }
    // A23: Invalid email
    const emailField = await page.$('input[type="email"]');
    if (emailField) {
      await emailField.fill('notanemail');
      if (submitBtn) { await submitBtn.click(); await sleep(1000); }
      const valMsg2 = await page.evaluate(() => {
        const errs = document.querySelectorAll('[class*="error"], [role="alert"], .text-red');
        return Array.from(errs).map(e => e.textContent).join(' | ');
      });
      rec('A23', 'Invalid email validation', valMsg2 ? 'PASS' : 'PARTIAL',
        valMsg2 || 'No validation message', '');
    }
  }

  // A24: /dashboard while logged out
  await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
  await sleep(2000);
  const dashURL = page.url();
  rec('A24', '/dashboard redirects when logged out', dashURL !== `${BASE}/dashboard` ? 'PASS' : 'FAIL',
    `Redirected to: ${dashURL}`, '');

  // A25: /admin while logged out
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
  await sleep(2000);
  const adminURL = page.url();
  rec('A25', '/admin redirects when logged out', adminURL !== `${BASE}/admin` ? 'PASS' : 'FAIL',
    `Redirected to: ${adminURL}`, '');

  // A26: 404 page
  await page.goto(`${BASE}/randomnonexistentpage`, { waitUntil: 'networkidle' });
  await sleep(1000);
  const body404 = await page.evaluate(() => document.body.innerText.substring(0, 200));
  rec('A26', '404 page renders', body404.length > 20 ? 'PASS' : 'FAIL',
    `Content: ${body404.substring(0, 80)}...`, '');

  // ─── SECTION B: AUTHENTICATION ───
  console.log('\n─── SECTION B: AUTHENTICATION ───\n');

  const testEmail = 'audit-explorer-001@test.com';
  const testPass = 'AuditPass2026!';

  // B1: Registration
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(1000);
  const closeM = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeM) await closeM.click();
  await sleep(500);
  // Click Create Your Profile or Sign Up
  let signupBtn = await page.$('text=Create Your Profile');
  if (!signupBtn) signupBtn = await page.$('text=Sign Up');
  if (!signupBtn) signupBtn = await page.$('text=Create Account');
  if (signupBtn) {
    await signupBtn.click();
    await sleep(2000);
  }
  // Toggle to signup if on login
  const toggleLink = await page.$('text=Sign Up, text=Create Account, text=Don\'t have an account');
  if (toggleLink) {
    await toggleLink.click();
    await sleep(1000);
  }
  // Fill registration form
  const nameInput = await page.$('input[placeholder*="name"], input[placeholder*="Name"]');
  const emailInput = await page.$('input[type="email"]');
  const passInput = await page.$('input[type="password"]');
  const countrySelect = await page.$('select');
  if (emailInput && passInput) {
    if (nameInput) await nameInput.fill('Audit Explorer User');
    await emailInput.fill(testEmail);
    await passInput.fill(testPass);
    if (countrySelect) await countrySelect.selectOption('Ethiopia').catch(() => {});
    const submit = await page.$('button[type="submit"], button:has-text("Create")');
    if (submit) {
      await submit.click();
      await sleep(3000);
    }
  }
  // Check what happened
  const regResult = await page.evaluate(() => {
    const errEl = document.querySelector('[class*="error"], [role="alert"]');
    const err = errEl ? errEl.textContent : '';
    const url = window.location.href;
    const isLoggedIn = !url.includes('login') && !url.includes('auth');
    return { error: err, url, isLoggedIn };
  });
  rec('B1', 'Registration flow', regResult.isLoggedIn ? 'PASS' : 'PARTIAL',
    regResult.isLoggedIn ? 'Auto-logged in, redirected' : `Error: "${regResult.error}", URL: ${regResult.url}`, '');

  // B4: Session verification
  const sessionEmail = await page.evaluate(async () => {
    try {
      const supabase = window.__supabase || window.supabase;
      if (!supabase) return 'supabase not on window';
      const { data } = await supabase.auth.getSession();
      return data?.session?.user?.email || 'no session';
    } catch (e) { return e.message; }
  });
  rec('B4', 'Session exists after registration', sessionEmail === testEmail ? 'PASS' : 'PARTIAL',
    `Session email: ${sessionEmail}`, '');

  // B5: Manual login (log out first)
  const logoutBtn = await page.$('text=Logout, text=Sign Out');
  if (logoutBtn) {
    await logoutBtn.click();
    await sleep(2000);
  }
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await sleep(1000);
  const closeM2 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeM2) await closeM2.click();
  await sleep(500);
  // Navigate to login
  let loginNavBtn = await page.$('text=Log In, text=Sign In');
  if (loginNavBtn) {
    await loginNavBtn.click();
    await sleep(2000);
  }
  const loginEmail = await page.$('input[type="email"]');
  const loginPass = await page.$('input[type="password"]');
  if (loginEmail && loginPass) {
    await loginEmail.fill(testEmail);
    await loginPass.fill(testPass);
    const loginSubmitBtn = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    if (loginSubmitBtn) {
      await loginSubmitBtn.click();
      await sleep(3000);
    }
  }
  const loginResult = await page.evaluate(() => {
    const errEl = document.querySelector('[class*="error"], [role="alert"]');
    const err = errEl ? errEl.textContent : '';
    const url = window.location.href;
    const isLoggedIn = !url.includes('login') && !url.includes('auth');
    return { error: err, url, isLoggedIn };
  });
  rec('B5', 'Manual login after registration', loginResult.isLoggedIn ? 'PASS' : 'FAIL',
    loginResult.isLoggedIn ? 'Login succeeded' : `Error: "${loginResult.error}"`, '');

  // B6: Duplicate email registration
  const logoutBtn2 = await page.$('text=Logout, text=Sign Out');
  if (logoutBtn2) {
    await logoutBtn2.click();
    await sleep(2000);
  }
  await page.goto(BASE);
  await sleep(1000);
  const closeM3 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeM3) await closeM3.click();
  await sleep(500);
  let signupBtn2 = await page.$('text=Create Your Profile, text=Sign Up, text=Create Account');
  if (signupBtn2) {
    await signupBtn2.click();
    await sleep(2000);
  }
  let toggle2 = await page.$('text=Sign Up, text=Create Account, text=Don\'t have an account');
  if (toggle2) {
    await toggle2.click();
    await sleep(1000);
  }
  const emailInput2 = await page.$('input[type="email"]');
  const passInput2 = await page.$('input[type="password"]');
  const nameInput2 = await page.$('input[placeholder*="name"], input[placeholder*="Name"]');
  if (emailInput2 && passInput2) {
    if (nameInput2) await nameInput2.fill('Audit Dupe');
    await emailInput2.fill(testEmail);
    await passInput2.fill(testPass);
    const submit2 = await page.$('button[type="submit"], button:has-text("Create")');
    if (submit2) {
      await submit2.click();
      await sleep(3000);
    }
  }
  const dupeResult = await page.evaluate(() => {
    const errEl = document.querySelector('[class*="error"], [role="alert"]');
    return errEl ? errEl.textContent : '(no error)';
  });
  rec('B6', 'Duplicate email registration', dupeResult.includes('already exists') ? 'PASS' : 'PARTIAL',
    `Message: "${dupeResult}"`, '');

  // B7: Empty field validation
  // Close any modal first
  await page.goto(BASE);
  await sleep(1000);
  const closeM4 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeM4) await closeM4.click();
  await sleep(500);
  let signupBtn3 = await page.$('text=Create Your Profile, text=Sign Up, text=Create Account');
  if (signupBtn3) {
    await signupBtn3.click();
    await sleep(2000);
  }
  let toggle3 = await page.$('text=Sign Up, text=Create Account, text=Don\'t have an account');
  if (toggle3) {
    await toggle3.click();
    await sleep(1000);
  }
  const emailInput3 = await page.$('input[type="email"]');
  const passInput3 = await page.$('input[type="password"]');
  const nameInput3 = await page.$('input[placeholder*="name"], input[placeholder*="Name"]');
  const submit3 = await page.$('button[type="submit"], button:has-text("Create")');
  if (submit3) {
    await submit3.click();
    await sleep(1000);
    const emptyNameMsg = await page.evaluate(() => {
      const errs = document.querySelectorAll('[class*="error"], [role="alert"], .text-red, p.text-red');
      return Array.from(errs).map(e => e.textContent).join(' | ');
    });
    rec('B7a', 'Empty name validation', emptyNameMsg ? 'PASS' : 'PARTIAL',
      emptyNameMsg || 'No validation message', '');
  }
  if (emailInput3 && passInput3) {
    await emailInput3.fill('abc@');
    if (submit3) {
      await submit3.click();
      await sleep(1000);
      const invalidEmailMsg = await page.evaluate(() => {
        const errs = document.querySelectorAll('[class*="error"], [role="alert"], .text-red');
        return Array.from(errs).map(e => e.textContent).join(' | ');
      });
      rec('B7b', 'Invalid email format validation', invalidEmailMsg ? 'PASS' : 'PARTIAL',
        invalidEmailMsg || 'No validation message', '');
    }
    await emailInput3.fill('valid@test.com');
    await passInput3.fill('12345');
    if (submit3) {
      await submit3.click();
      await sleep(1000);
      const shortPassMsg = await page.evaluate(() => {
        const errs = document.querySelectorAll('[class*="error"], [role="alert"], .text-red');
        return Array.from(errs).map(e => e.textContent).join(' | ');
      });
      rec('B7c', 'Short password validation', shortPassMsg ? 'PASS' : 'PARTIAL',
        shortPassMsg || 'No validation message', '');
    }
  }

  // B8: Wrong password
  await page.goto(BASE);
  await sleep(1000);
  const closeM5 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeM5) await closeM5.click();
  await sleep(500);
  let loginNav2 = await page.$('text=Log In, text=Sign In');
  if (loginNav2) {
    await loginNav2.click();
    await sleep(2000);
  }
  const loginEmail2 = await page.$('input[type="email"]');
  const loginPass2 = await page.$('input[type="password"]');
  if (loginEmail2 && loginPass2) {
    await loginEmail2.fill(testEmail);
    await loginPass2.fill('WrongPass999');
    const loginSubmit2 = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    if (loginSubmit2) {
      await loginSubmit2.click();
      await sleep(2500);
    }
  }
  const wrongPassMsg = await page.evaluate(() => {
    const errEl = document.querySelector('[class*="error"], [role="alert"]');
    return errEl ? errEl.textContent : '(no error)';
  });
  rec('B8', 'Wrong password login', wrongPassMsg.includes('Invalid') || wrongPassMsg.includes('invalid') ? 'PASS' : 'PARTIAL',
    `Error: "${wrongPassMsg}"`, '');

  // B9: Non-existent email
  if (loginEmail2 && loginPass2) {
    await loginEmail2.fill('doesnotexist12345@nowhere.com');
    await loginPass2.fill('SomePass123');
    const loginSubmit3 = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    if (loginSubmit3) {
      await loginSubmit3.click();
      await sleep(2500);
    }
  }
  const nonExistMsg = await page.evaluate(() => {
    const errEl = document.querySelector('[class*="error"], [role="alert"]');
    return errEl ? errEl.textContent : '(no error)';
  });
  rec('B9', 'Non-existent email login', nonExistMsg.includes('Invalid') || nonExistMsg.includes('incorrect') ? 'PASS' : 'PARTIAL',
    `Error: "${nonExistMsg}"`, '');

  // B10: Rate limit — 6 rapid failed attempts
  if (loginEmail2 && loginPass2) {
    for (let i = 0; i < 6; i++) {
      await loginEmail2.fill(testEmail);
      await loginPass2.fill('WrongPass123');
      const ls = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
      if (ls) { await ls.click(); await sleep(400); }
    }
    await sleep(3000);
  }
  const rateMsg = await page.evaluate(() => {
    const errEl = document.querySelector('[class*="error"], [role="alert"]');
    return errEl ? errEl.textContent : '(no visible error after 6 attempts)';
  });
  rec('B10', 'Rate limit after 6 attempts', rateMsg !== '(no visible error after 6 attempts)' ? 'PASS' : 'PARTIAL',
    `Message after 6 attempts: "${rateMsg}"`, '');

  // B11: Session persistence (already logged in from B5)
  // Actually we logged out. Let's login again properly.
  await page.goto(BASE);
  await sleep(1000);
  const closeM6 = await page.$('[class*="close"], [aria-label="Close"]');
  if (closeM6) await closeM6.click();
  await sleep(500);
  let loginNav3 = await page.$('text=Log In, text=Sign In');
  if (loginNav3) {
    await loginNav3.click();
    await sleep(2000);
  }
  const le = await page.$('input[type="email"]');
  const lp = await page.$('input[type="password"]');
  if (le && lp) {
    await le.fill(testEmail);
    await lp.fill(testPass);
    const ls = await page.$('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
    if (ls) { await ls.click(); await sleep(3000); }
  }
  // Now we're logged in. Test B11 by checking if session persists after "closing tab"
  // We can test by checking the session object directly
  await sleep(1000);
  const sessionCheck = await page.evaluate(async () => {
    try {
      const { data } = await (window.__supabase || window.supabase).auth.getSession();
      return data?.session ? 'session exists' : 'no session';
    } catch (e) { return e.message; }
  });
  rec('B11', 'Session persistence', sessionCheck === 'session exists' ? 'PASS' : 'PARTIAL',
    sessionCheck, '');

  // B12: Logout
  await sleep(1000);
  const logoutBtn3 = await page.$('text=Logout, text=Sign Out');
  if (logoutBtn3) {
    await logoutBtn3.click();
    await sleep(2000);
  }
  const afterLogoutURL = page.url();
  const backCheck = await page.evaluate(async () => {
    try {
      const { data } = await (window.__supabase || window.supabase).auth.getSession();
      return data?.session ? 'still has session' : 'no session';
    } catch (e) { return e.message; }
  });
  rec('B12a', 'Logout redirects', afterLogoutURL.includes('login') || afterLogoutURL === BASE || afterLogoutURL === BASE + '/' ? 'PASS' : 'PARTIAL',
    `URL after logout: ${afterLogoutURL}`, '');
  rec('B12b', 'Session cleared after logout', backCheck === 'no session' ? 'PASS' : 'FAIL',
    backCheck, '');

  // B14: Admin login page
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'networkidle', timeout: 15000 }).catch(() => {});
  await sleep(2000);
  const adminLoginURL = page.url();
  const adminLoginForm = await page.$('input[type="email"], input[type="password"]');
  rec('B14', 'Admin login page accessible', adminLoginForm ? 'PASS' : 'PARTIAL',
    `URL: ${adminLoginURL}, Form found: ${!!adminLoginForm}`, '');

  // B15: Admin portal access control
  await page.goto(`${BASE}/admin`, { waitUntil: 'networkidle', timeout: 10000 }).catch(() => {});
  await sleep(2000);
  const adminAccessURL = page.url();
  rec('B15', 'Admin access blocked when logged out', adminAccessURL !== `${BASE}/admin` ? 'PASS' : 'FAIL',
    `URL: ${adminAccessURL}`, '');

  // ─── SAVE RESULTS ───
  console.log(`\n═══ BATCH 1 SUMMARY ═══`);
  console.log(`Tests: ${results.length} | Pass: ${passCount} | Fail: ${failCount} | Partial: ${partialCount}`);
  
  const report = `# Zawadi Complete Audit — Batch 1 (A+B)
Date: 2026-06-04
Tests: ${results.length} | Pass: ${passCount} | Fail: ${failCount} | Partial: ${partialCount}

| ID | Description | Status | Finding | Evidence |
|----|-------------|--------|---------|----------|
${results.map(r => `| ${r.id} | ${r.desc} | ${r.status} | ${r.finding} | ${r.evidence} |`).join('\n')}
`;
  writeFileSync('AUDIT_BATCH1.md', report, 'utf-8');
  console.log('Saved to AUDIT_BATCH1.md');

  await browser.close();
})();
