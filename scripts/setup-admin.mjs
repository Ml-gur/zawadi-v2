// Zawadi Admin Setup Script
// Usage: node scripts/setup-admin.mjs
// Reads ADMIN_EMAIL and ADMIN_PASSWORD from .env and creates/updates the admin account
// via the setup-admin Supabase Edge Function.

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env file not found.');
    process.exit(1);
  }
  const text = readFileSync(envPath, 'utf-8');
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    process.env[key] = value;
  }
}

loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SETUP_SECRET = process.env.SETUP_ADMIN_SECRET || 'zawadi-setup-2026-xk9m';

if (!SUPABASE_URL) {
  console.error('ERROR: SUPABASE_URL must be in .env');
  process.exit(1);
}
if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('ERROR: ADMIN_EMAIL and ADMIN_PASSWORD must be in .env');
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

async function main() {
  console.log('=== Zawadi Admin Setup ===');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Admin Email: ${ADMIN_EMAIL}`);
  console.log('');

  const answer = await ask('Create or update admin account? (Y/n): ');
  if (answer.toLowerCase() === 'n') {
    console.log('Aborted.');
    process.exit(0);
  }

  const fnUrl = `${SUPABASE_URL}/functions/v1/setup-admin`;

  try {
    const res = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-setup-secret': SETUP_SECRET,
      },
      body: JSON.stringify({
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
      }),
    });

    const data = await res.json();

    if (res.ok || res.status === 409) {
      if (data.success) {
        console.log(`\n✓ Admin account created successfully:`);
        console.log(`  Email: ${data.email}`);
        console.log(`  User ID: ${data.user_id}`);
      } else if (res.status === 409) {
        console.log(`\n→ Admin account already exists.`);
        console.log(`  User ID: ${data.user_id}`);
        console.log(`  Email: ${ADMIN_EMAIL}`);
      }
      console.log(`\nYou can now log in at /admin/login`);
    } else {
      console.error(`\n✗ Failed: ${data.error || res.statusText}`);
      console.error(`\nMake sure the setup-admin Edge Function is deployed:`);
      console.error(`  supabase functions deploy setup-admin`);
      console.error(`And SETUP_ADMIN_SECRET is set as a secret:`);
      console.error(`  supabase secrets set SETUP_ADMIN_SECRET=${SETUP_SECRET}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n✗ Connection error:`, err.message);
    console.error(`Make sure the setup-admin Edge Function is deployed.`);
    process.exit(1);
  }

  rl.close();
}

main();
