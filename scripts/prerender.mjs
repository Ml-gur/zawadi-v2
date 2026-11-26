// Renders Techsari's public pages to static HTML after `vite build`.
//
//   npm run build   →   vite build  →  vite build --ssr  →  node scripts/prerender.mjs
//
// Why: the site is a client-rendered SPA, so crawlers that don't run
// JavaScript (GPTBot, ClaudeBot, PerplexityBot, many link-preview bots) saw an
// empty <div id="root">, and Google only saw content after a deferred render.
// Each prerendered page ships its full content, its own title/description/
// canonical in <head>, and the data it was built with (so the first client
// render shows the same content instead of a loading state).
//
// Safe by default: if the SSR bundle or Supabase is unavailable the script
// logs a warning and leaves the plain SPA in place (exit code 0), so a data
// outage can never break a deploy. dist/app-shell.html (the SPA shell, emitted
// by vite.config.ts) is what every non-prerendered route is served.
//
// Freshness: listings are baked in at build time. Trigger a rebuild daily with
// a Vercel deploy hook (see README).

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist');
const SSR_ENTRY = path.join(ROOT, 'dist-ssr', 'entry-server.js');
const SEED_ID = '__TECHSARI_SEED__';

const STATIC_ROUTES = ['/', '/about', '/faq', '/how-it-works', '/contact', '/privacy', '/terms', '/scholarships/browse'];

// Same columns the public list API returns
const LIST_COLUMNS = 'id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,urgency,description,no_ielts,targets_financial_need,targets_first_generation,is_intra_african,fields_of_study,host_region,iso2,opens_at,updated_at';
// What the detail page renders — deliberately without apply_url / source_url,
// which must not be published in static HTML (see SEO.md)
const DETAIL_COLUMNS = 'id,slug,name,provider,countries,degree_levels,funding_type,amount,deadline,urgency,description,no_ielts,targets_financial_need,targets_first_generation,is_intra_african,updated_at,fields_of_study,instruction_language,host_institution,host_country,host_region,iso2,targets_rural_origin,targets_ldc_countries,stem_focus,development_focus,min_gpa_normalised,requires_leadership,requires_community,required_documents,eligibility,published';
// Enough for "Similar scholarships" and hub chips on detail pages
const SLIM_KEYS = ['id', 'slug', 'name', 'countries', 'degree_levels', 'funding_type', 'deadline', 'no_ielts'];

function warn(msg) {
  console.warn(`[prerender] ${msg}`);
}

async function loadEnv() {
  // Vercel provides these at build time; locally, read .env.local / .env
  for (const name of ['.env.local', '.env']) {
    const file = path.join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of (await readFile(file, 'utf8')).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY,
  };
}

async function fetchScholarships({ url, key }, columns) {
  const today = new Date().toISOString().slice(0, 10);
  const query = new URLSearchParams({
    select: columns,
    published: 'eq.true',
    or: `(deadline.is.null,deadline.gte.${today})`,
    order: 'deadline.asc.nullslast',
    limit: '1000',
  });
  const res = await fetch(`${url}/rest/v1/scholarships?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

async function loadData(env) {
  try {
    const list = await fetchScholarships(env, LIST_COLUMNS).catch(async (err) => {
      // migration 015 (opens_at) not applied yet — retry without the column
      if (/opens_at/.test(String(err))) return fetchScholarships(env, LIST_COLUMNS.replace(',opens_at', ''));
      throw err;
    });
    const details = await fetchScholarships(env, DETAIL_COLUMNS);
    const list300 = list.map((s) => ({ ...s, description: s.description ? String(s.description).slice(0, 300) : null }));
    return { list: list300, details };
  } catch (err) {
    warn(`could not load scholarships (${err.message}); prerendering pages without listings data`);
    return { list: null, details: [] };
  }
}

// <script type="application/json"> is never executed, so only a literal "</script>" can break out
const escapeJson = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

// React 19 emits <title>/<meta>/<link rel="canonical"> where <SEO> renders
// them. Move them into <head>, marked data-mw so src/main.tsx removes them
// before the client re-creates its own (no duplicates in the live DOM), and so
// middleware.ts can strip them for crawlers.
const HEAD_TAG_RE = /<title\b[^>]*>[\s\S]*?<\/title>|<meta\b[^>]*\b(?:name|property)="(?:description|robots|keywords|og:[^"]*|twitter:[^"]*)"[^>]*\/?>|<link\b[^>]*\brel="canonical"[^>]*\/?>/gi;

function splitHead(appHtml) {
  const head = [];
  const body = appHtml.replace(HEAD_TAG_RE, (tag) => {
    head.push(tag.replace(/^<(title|meta|link)\b/i, '<$1 data-mw'));
    return '';
  });
  return { head, body };
}

// The shell's own fallback tags are data-mw marked (index.html); a page's
// rendered tags replace them.
const SHELL_TAG_RE = /<(?:title|meta|link)\b[^>]*\bdata-mw\b[^>]*>(?:[\s\S]*?<\/title>)?\s*/gi;

function buildPage(shell, appHtml, seed) {
  const { head, body } = splitHead(appHtml);
  if (!head.some((t) => /^<title/i.test(t))) throw new Error('rendered page has no <title>');
  const seedTag = `<script id="${SEED_ID}" type="application/json">${escapeJson(seed)}</script>`;
  return shell
    .replace(SHELL_TAG_RE, '')
    .replace('</head>', () => `${head.join('\n')}\n${seedTag}\n</head>`)
    .replace('<div id="root"></div>', () => `<div id="root">${body}</div>`);
}

async function writeRoute(route, html) {
  const file = route === '/' ? path.join(DIST, 'index.html') : path.join(DIST, ...route.split('/').filter(Boolean), 'index.html');
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, html);
}

async function main() {
  const shellFile = path.join(DIST, 'app-shell.html');
  if (!existsSync(shellFile)) {
    warn('dist/app-shell.html is missing (run `vite build` first); nothing prerendered');
    return;
  }
  const shell = await readFile(shellFile, 'utf8');
  if (!shell.includes('<div id="root"></div>')) {
    warn('unexpected shell markup; nothing prerendered');
    return;
  }

  let ssr;
  try {
    ssr = await import(pathToFileURL(SSR_ENTRY).href);
  } catch (err) {
    warn(`SSR bundle unavailable (${err.message}); keeping the client-rendered SPA`);
    return;
  }

  const env = await loadEnv();
  if (!env.url || !env.key) {
    warn('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY not set; keeping the client-rendered SPA');
    return;
  }

  const { list, details } = await loadData(env);
  const slim = list ? list.map((s) => Object.fromEntries(SLIM_KEYS.map((k) => [k, s[k]]))) : undefined;

  const jobs = [
    ...STATIC_ROUTES.map((route) => ({ route, seed: route === '/scholarships/browse' && list ? { list } : {} })),
    ...(list ? ssr.HUBS.map((hub) => ({ route: ssr.hubPath(hub), seed: { list } })) : []),
    ...details.map((detail) => ({ route: `/scholarships/browse/${detail.slug || detail.id}`, seed: { detail, list: slim } })),
  ];

  let ok = 0;
  const failures = [];
  for (const { route, seed } of jobs) {
    try {
      const appHtml = await ssr.render(route, seed);
      await writeRoute(route, buildPage(shell, appHtml, seed));
      ok++;
    } catch (err) {
      failures.push(`${route}: ${err.message}`);
    }
  }
  console.log(`[prerender] ${ok}/${jobs.length} pages written`);
  if (failures.length) {
    warn(`${failures.length} page(s) left client-rendered:\n  ${failures.slice(0, 10).join('\n  ')}`);
  }
}

main().catch((err) => {
  // Never fail the deploy over prerendering
  warn(`failed: ${err.stack || err.message}`);
});
