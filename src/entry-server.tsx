// Build-time renderer used by scripts/prerender.mjs (built with `vite build --ssr`).
// Not part of the browser bundle.
import { StrictMode } from 'react';
import { prerenderToNodeStream } from 'react-dom/static';
import { HelmetProvider } from 'react-helmet-async';
import { StaticRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { setSeed, type PrerenderSeed } from './lib/prerender-seed';

export { HUBS, hubPath } from './lib/scholarship-hubs';

/**
 * Renders one URL to HTML, waiting for every lazy route chunk to resolve
 * (prerenderToNodeStream, unlike renderToString, waits on Suspense).
 * Analytics and the cookie banner are left out: they are per-visitor and
 * client-only.
 */
export async function render(url: string, seed: PrerenderSeed): Promise<string> {
  setSeed(seed);
  const { prelude } = await prerenderToNodeStream(
    <StrictMode>
      <HelmetProvider>
        <StaticRouter location={url}>
          <ErrorBoundary>
            <App />
          </ErrorBoundary>
        </StaticRouter>
      </HelmetProvider>
    </StrictMode>,
    // React 19 "outlines" Suspense boundaries above ~12 KB into a hidden
    // segment plus an inline swap script, even in static prerender. Crawlers
    // that don't run JS would then see the "Loading…" fallback instead of the
    // page. Keep every boundary inline.
    { progressiveChunkSize: Number.POSITIVE_INFINITY },
  );
  let html = '';
  for await (const chunk of prelude) html += typeof chunk === 'string' ? chunk : Buffer.from(chunk).toString('utf8');
  setSeed({});
  return html;
}
