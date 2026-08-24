import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import Analytics from './components/Analytics';
import '@fontsource/inter-tight/400.css';
import '@fontsource/inter-tight/500.css';
import '@fontsource/inter-tight/600.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import './index.css';

document.documentElement.classList.add('js');

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <Analytics />
        <VercelAnalytics />
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
);
