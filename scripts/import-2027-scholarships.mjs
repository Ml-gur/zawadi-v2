#!/usr/bin/env node
/**
 * Imports the 2027-cycle scholarships into Supabase.
 *
 * Idempotent and duplicate-safe. The 2027 batch overlaps the existing catalogue:
 * three of the eighteen records were already live under their own ids
 * (Commonwealth, Gates Cambridge, Knight-Hennessy), so a migration that upserts
 * on `id` alone — as the original 2027 SQL did — would have created three
 * duplicate listings. A row is therefore skipped when ANY of these match an
 * existing row:
 *
 *   - the same id
 *   - the same slug   (scholarships.slug carries a unique index)
 *   - the same name after normalisation (these listings have no canonical key)
 *
 * Re-running is safe: it reports what it skipped and inserts only what is new.
 *
 * Usage:
 *   node scripts/import-2027-scholarships.mjs --dry-run   # preview, no writes
 *   node scripts/import-2027-scholarships.mjs             # apply
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (read from .env).
 */
import { readFileSync } from 'node:fs';

const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY_ONLY = process.argv.includes('--verify');

function loadEnv() {
  const env = {};
  for (const file of ['.env', '.env.local']) {
    let raw;
    try {
      raw = readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const line of raw.split('\n')) {
      if (!line.includes('=') || line.trim().startsWith('#')) continue;
      const key = line.slice(0, line.indexOf('=')).trim();
      env[key] ??= line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '');
    }
  }
  return env;
}

const env = loadEnv();
const SUPABASE_URL = process.env.SUPABASE_URL || env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
};

/** Lowercase, strip punctuation and collapse whitespace. */
const normaliseName = (name) =>
  String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function fetchAllExisting() {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/scholarships?select=id,name,slug&limit=1000&offset=${offset}`,
      { headers },
    );
    if (!res.ok) throw new Error(`fetch existing failed: HTTP ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) break;
  }
  return rows;
}

/**
 * Recounts the table and reports duplicate display names. Only duplicates of the
 * names this batch owns are fatal; older duplicates elsewhere are surfaced as a
 * warning so they are not silently attributed to this run.
 */
function reportDuplicates(rows, ownedNames, before) {
  const byName = new Map();
  for (const row of rows) {
    const key = normaliseName(row.name);
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push(row);
  }

  const duplicates = [...byName.entries()].filter(([, group]) => group.length > 1);
  const introduced = duplicates.filter(([name]) => ownedNames.has(name));
  const preExisting = duplicates.filter(([name]) => !ownedNames.has(name));

  console.log(
    before == null
      ? `\nRows in scholarships: ${rows.length}`
      : `\nRows before: ${before}   after: ${rows.length}   delta: ${rows.length - before}`,
  );

  if (preExisting.length) {
    console.log(`\nWARNING - ${preExisting.length} duplicate name(s) already existed before this import:`);
    for (const [, group] of preExisting) {
      console.log(`  x${group.length}  ${group.map((r) => r.id).join(', ')}  (${group[0].name})`);
    }
  }

  if (introduced.length) {
    console.error(`\nFAIL - this import introduced ${introduced.length} duplicate name(s):`);
    for (const [name, group] of introduced) {
      console.error(`  x${group.length}  ${group.map((r) => r.id).join(', ')}  (${name})`);
    }
    process.exit(1);
  }

  console.log('\nPASS - this import introduced no duplicate display names.');
}

async function main() {
  const incoming = JSON.parse(readFileSync('scripts/data/scholarships-2027.json', 'utf8'));
  console.log(`Loaded ${incoming.length} 2027-cycle scholarships from scripts/data/scholarships-2027.json\n`);

  const existing = await fetchAllExisting();
  console.log(`Existing rows in scholarships: ${existing.length}\n`);

  const knownIds = new Map(existing.map((r) => [r.id, r]));
  const knownSlugs = new Map(existing.filter((r) => r.slug).map((r) => [r.slug, r]));
  const knownNames = new Map(existing.map((r) => [normaliseName(r.name), r]));

  const toInsert = [];
  const skipped = [];

  for (const record of incoming) {
    const reasons = [];
    if (knownIds.has(record.id)) reasons.push(`id already present (${record.id})`);
    if (record.slug && knownSlugs.has(record.slug)) reasons.push(`slug already present (${record.slug})`);
    const nameMatch = knownNames.get(normaliseName(record.name));
    if (nameMatch) reasons.push(`name already present as ${nameMatch.id}`);

    if (reasons.length) skipped.push({ name: record.name, reasons });
    else toInsert.push(record);
  }

  if (skipped.length) {
    console.log(`SKIPPED — already in the catalogue (${skipped.length}):`);
    for (const s of skipped) console.log(`  = ${s.name}\n      ${s.reasons.join('; ')}`);
    console.log();
  }

  console.log(`TO INSERT (${toInsert.length}):`);
  for (const r of toInsert) console.log(`  + ${r.name}  [${r.slug}]`);
  console.log();

  const ownedNames = new Set([...toInsert, ...skipped].map((r) => normaliseName(r.name)));

  if (VERIFY_ONLY) {
    reportDuplicates(await fetchAllExisting(), ownedNames);
    return;
  }

  if (DRY_RUN) {
    console.log('Dry run — nothing written.');
    return;
  }

  if (toInsert.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/scholarships`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(toInsert),
  });

  if (!res.ok) {
    console.error(`INSERT failed: HTTP ${res.status}`);
    console.error(await res.text());
    process.exit(1);
  }

  const inserted = await res.json();
  console.log(`Inserted ${inserted.length} row(s).`);

  reportDuplicates(await fetchAllExisting(), ownedNames, existing.length);
}

main().catch((err) => {
  console.error('Import failed:', err.message);
  process.exit(1);
});
