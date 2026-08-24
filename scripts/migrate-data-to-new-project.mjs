// Copies all published scholarships from the OLD Supabase project into the NEW one.
// Run AFTER the SQL migrations have been executed on the new project (see progress.md for order).
//
// Usage:  node scripts/migrate-data-to-new-project.mjs
//
// Reads via the old project's anon key (published rows only — exactly what production shows)
// and writes via the new project's service role key (bypasses RLS for the insert).

import { createClient } from '@supabase/supabase-js';

const OLD_URL = 'https://dgiqyvnpmeiomvfauetw.supabase.co';
const OLD_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRnaXF5dm5wbWVpb212ZmF1ZXR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMzMsImV4cCI6MjA5NTYyNTEzM30.54iCqhxEg_Pbx6bEsAJwwmxjM62rlO0i8-Rk8zYppqk';

const NEW_URL = process.env.SUPABASE_URL || 'https://raomkgvnkgvbbezffpyb.supabase.co';
const NEW_SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!NEW_SERVICE_ROLE) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing — run with the .env loaded or export it first.');
  process.exit(1);
}

const oldClient = createClient(OLD_URL, OLD_ANON);
const newClient = createClient(NEW_URL, NEW_SERVICE_ROLE);

async function fetchAll() {
  const PAGE = 200;
  let from = 0;
  const all = [];
  for (;;) {
    const { data, error } = await oldClient
      .from('scholarships')
      .select('*')
      .eq('published', true)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Old project read failed: ${error.message}`);
    all.push(...data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return all;
}

async function main() {
  console.log('Reading published scholarships from the old project…');
  const rows = await fetchAll();
  console.log(`Fetched ${rows.length} rows.`);

  const CHUNK = 50;
  let ok = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map(({ view_count, ...rest }) => ({
      ...rest,
      view_count: 0,
    }));
    const { error } = await newClient.from('scholarships').upsert(chunk, { onConflict: 'id' });
    if (error) {
      console.error(`Chunk ${i / CHUNK} failed:`, error.message);
      process.exit(1);
    }
    ok += chunk.length;
    console.log(`  upserted ${ok}/${rows.length}`);
  }
  console.log('Done. Verify in the new project:');
  console.log(`  curl "${NEW_URL}/rest/v1/scholarships?select=id&limit=5" -H "apikey: <anon>"`);
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
