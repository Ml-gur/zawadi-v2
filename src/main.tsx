import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import Analytics from './components/Analytics';
import CookieConsent from './components/CookieConsent';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';
import { readSeedFromDom } from './lib/prerender-seed';

document.documentElement.classList.add('js');

// Crawler-only head tags injected by middleware.ts. <SEO> re-creates them per
// route, so drop the server copies to keep one title/canonical in the DOM.
document.querySelectorAll('head [data-mw]').forEach((el) => el.remove());

// Prerendered pages embed the data they were built with (scripts/prerender.mjs).
// The client renders from scratch (createRoot, not hydrateRoot): the auth and
// cookie UI differ per visitor, so the server HTML is a first paint for people
// and the full content for crawlers, then React takes over.
readSeedFromDom();

/* Animated favicon — swaps between two frames while the tab is visible. */
(function animateFavicon() {
  const frameA = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!frameA) return;
  const draw = (bg: string, z: string, dot: string) =>
    'data:image/svg+xml,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect x="4" y="4" width="56" height="56" rx="16" fill="${bg}" stroke="${z}" stroke-width="4"/><path d="M20 20 H44 L24 40 H46" fill="none" stroke="${z}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><circle cx="47" cy="47" r="7" fill="${dot}"/></svg>`
    );
  const frames = [draw('#beff50', '#14140f', '#466800'), draw('#f5f5eb', '#14140f', '#9bd92a')];
  let i = 0;
  setInterval(() => {
    if (document.hidden) return;
    i = (i + 1) % frames.length;
    frameA.href = frames[i];
  }, 1400);
})();

/* Idle-time prefetch of the heaviest route chunks so nav feels instant. */
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => {
    import('./components/Scholarships').catch(() => {});
    import('./components/Dashboard').catch(() => {});
    import('./pages/public/PublicScholarshipList').catch(() => {});
  });
}

const app = (
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Analytics />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <CookieConsent />
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>
);

const container = document.getElementById('root')!;

if (container.hasChildNodes()) {
  // Prerendered page: rendering straight into it would wipe the content and
  // show "Loading…" while the lazy route chunk downloads (a visible flash and
  // layout shift). Render off-screen instead and swap once the page's heading
  // exists, or after 3s at the latest.
  const next = document.createElement('div');
  next.hidden = true;
  container.after(next);
  createRoot(next).render(app);
  const started = performance.now();
  // A timer, not requestAnimationFrame: rAF pauses in background tabs
  const timer = window.setInterval(() => {
    if (!next.querySelector('h1') && performance.now() - started < 3000) return;
    window.clearInterval(timer);
    container.remove();
    next.id = 'root';
    next.hidden = false;
  }, 30);
} else {
  createRoot(container).render(app);
}
