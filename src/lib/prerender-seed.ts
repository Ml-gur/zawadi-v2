// Data a prerendered page was built with.
//
// scripts/prerender.mjs renders public pages to HTML at build time. The data
// each page needs is passed in through setSeed() on the server and embedded in
// the page as <script id="__TECHSARI_SEED__" type="application/json">, which
// readSeedFromDom() picks up before the first client render. Components start
// from the seed instead of an empty "Loading…" state, then refresh in the
// background as they always did.

import type { ScholarshipTeaser } from '../pages/public/browse-shared';

export interface PrerenderSeed {
  /** Open listings. On detail pages this is a slimmed copy (enough for "Similar scholarships"). */
  list?: ScholarshipTeaser[];
  /** The scholarship a detail page shows (never includes apply_url / source_url). */
  detail?: Record<string, any>;
}

export const SEED_ELEMENT_ID = '__TECHSARI_SEED__';

let seed: PrerenderSeed = {};

/** Server side: set before rendering each page. */
export function setSeed(next: PrerenderSeed): void {
  seed = next || {};
}

export function getSeed(): PrerenderSeed {
  return seed;
}

/** Client side: call once before the first render. */
export function readSeedFromDom(): void {
  if (typeof document === 'undefined') return;
  const el = document.getElementById(SEED_ELEMENT_ID);
  if (!el?.textContent) return;
  try {
    seed = JSON.parse(el.textContent);
  } catch {
    seed = {};
  }
}
