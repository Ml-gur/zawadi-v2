#!/usr/bin/env node
/**
 * Post-deploy health probe for the `process-payment` Edge Function.
 *
 * These four checks are exactly the failure modes that produced
 * "Failed to send a request to the Edge Function" in the browser and made
 * every Paystack webhook 401/500 before it could upgrade a plan.
 *
 * SAFE / READ-ONLY: it never sends a valid user JWT, a valid Paystack
 * signature or any payload that can mutate data. Every request is expected
 * to be rejected (401/403/404) — we only inspect the status code, the CORS
 * headers and whether the Supabase gateway handled it instead of the function.
 *
 * Usage:
 *   node scripts/check-payment-edge.mjs
 *   node scripts/check-payment-edge.mjs --origin https://my-preview.vercel.app
 *
 * The publishable (anon) key is read from .env so the checks can get past the
 * Supabase gateway and reach the function itself. It is a public key.
 */

import { readFileSync } from 'node:fs';

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'raomkgvnkgvbbezffpyb';
const BASE_URL = process.env.SUPABASE_FUNCTIONS_URL || `https://${PROJECT_REF}.supabase.co/functions/v1`;
const FN_URL = `${BASE_URL}/process-payment`;

const PROD_ORIGIN = 'https://www.techsari.online';
const argOrigin = process.argv.indexOf('--origin');
const PREVIEW_ORIGIN = argOrigin > -1 ? process.argv[argOrigin + 1] : 'https://zawadi-v2.vercel.app';

function readEnvValue(key) {
  if (process.env[key]) return process.env[key];
  for (const file of ['.env', '.env.local']) {
    try {
      const line = readFileSync(file, 'utf8')
        .split('\n')
        .find((l) => l.trim().startsWith(`${key}=`));
      if (line) return line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    } catch {
      /* file missing — keep looking */
    }
  }
  return '';
}

const ANON_KEY = readEnvValue('VITE_SUPABASE_ANON_KEY') || readEnvValue('SUPABASE_ANON_KEY');

const results = [];

function record(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      ${detail}`);
}

async function probe(label, options) {
  const res = await fetch(options.url, options.init);
  return {
    label,
    status: res.status,
    acao: res.headers.get('access-control-allow-origin'),
    vary: res.headers.get('vary'),
    gatewayError: res.headers.get('sb-error-code'),
    servedBy: res.headers.get('x-served-by'),
  };
}

async function main() {
  console.log(`Probing ${FN_URL}\n`);

  // 1 + 2. Preflight must echo the caller's own origin, for the canonical
  //         domain *and* for preview/dev origins. A fallback origin here
  //         silently breaks the browser call (the reported bug).
  for (const origin of [PROD_ORIGIN, PREVIEW_ORIGIN]) {
    const r = await probe(origin, {
      url: FN_URL,
      init: {
        method: 'OPTIONS',
        headers: {
          Origin: origin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'authorization, apikey, content-type',
        },
      },
    });
    record(
      `preflight echoes origin (${origin})`,
      r.acao === origin && r.status < 400,
      `status=${r.status} access-control-allow-origin=${r.acao} (expected ${origin})`,
    );
  }

  // 3. Without `verify_jwt = false` the Supabase gateway 401s any request
  //    without an Authorization header — including every Paystack webhook.
  const webhook = await probe('webhook', {
    url: `${FN_URL}/webhook`,
    init: {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'deadbeef' },
      body: JSON.stringify({ event: 'charge.success', data: { reference: 'probe', status: 'success' } }),
    },
  });
  record(
    'gateway does not JWT-block /webhook (verify_jwt = false)',
    webhook.gatewayError !== 'UNAUTHORIZED_NO_AUTH_HEADER',
    webhook.gatewayError
      ? `blocked by gateway: sb-error-code=${webhook.gatewayError} — redeploy with config.toml [functions.process-payment] verify_jwt = false`
      : `reached the function: status=${webhook.status} (401 = signature rejected, which is correct)`,
  );

  // 4. A malformed signature must be rejected by the handler, never 500.
  //    A 500 here means the webhook handler is broken again (arg order,
  //    raw-body reuse, hex parsing, …).
  record(
    'malformed webhook signature is rejected, not a 500',
    webhook.status === 401,
    `status=${webhook.status} (expected 401)`,
  );

  // 5. Error responses must carry the caller's origin too, otherwise the
  //    browser hides the body and supabase-js only reports a generic
  //    "Failed to send a request to the Edge Function". A publishable key is
  //    sent so the gateway forwards the request to the function instead of
  //    answering it itself.
  if (!ANON_KEY) {
    console.log('SKIP  error response echoes origin (no VITE_SUPABASE_ANON_KEY/.env found)');
  } else {
    const errRes = await probe('unauthorized-POST', {
      url: FN_URL,
      init: {
        method: 'POST',
        headers: {
          Origin: PREVIEW_ORIGIN,
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'verify', reference: 'probe' }),
      },
    });
    record(
      `function-level error response echoes origin (${PREVIEW_ORIGIN})`,
      errRes.acao === PREVIEW_ORIGIN && errRes.status === 401,
      `status=${errRes.status} access-control-allow-origin=${errRes.acao} (expected ${PREVIEW_ORIGIN}, status 401)`,
    );
  }

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('Probe failed to run:', err.message);
  process.exit(1);
});
