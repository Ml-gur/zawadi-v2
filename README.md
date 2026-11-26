<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/749cd8f0-ca62-4977-a940-d23c0451e6a9

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Prerendered public pages (SEO)

`npm run build` renders the public pages (home, directory, the landing pages in
`src/lib/scholarship-hubs.ts` and every published scholarship) to static HTML
with `scripts/prerender.mjs`, so search engines and AI crawlers get full
content without running JavaScript. Every other route is served the plain SPA
shell (`dist/app-shell.html`).

Listings are baked in at build time. Keep them fresh with a daily rebuild:
create a Deploy Hook in Vercel (Project → Settings → Git → Deploy Hooks) and
call it once a day, e.g. from a cron service or a scheduled GitHub Action
(`curl -X POST <deploy-hook-url>`). If Supabase is unreachable during a build,
the script logs a warning and the site falls back to client rendering.
