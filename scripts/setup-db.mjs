// Zawadi Platform — Supabase DB Setup + Seed
// Usage: node scripts/setup-db.mjs
// Requires .env with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY

import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (no dotenv dependency needed)
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env');
  if (!existsSync(envPath)) {
    console.error('ERROR: .env file not found. Create it with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
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
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('ERROR: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q) {
  return new Promise(resolve => rl.question(q, resolve));
}

// --------------- SQL to create tables ---------------
const CREATE_TABLES_SQL = `

CREATE TABLE IF NOT EXISTS profiles (
  email TEXT PRIMARY KEY,
  name TEXT,
  country TEXT DEFAULT '',
  degree_level TEXT,
  field_of_study TEXT,
  date_of_birth TEXT,
  gpa NUMERIC(4,2),
  gpa_system TEXT,
  gpa_scale TEXT DEFAULT '4.0',
  native_language TEXT DEFAULT 'English',
  additional_languages JSONB DEFAULT '[]'::jsonb,
  study_country_preference TEXT,
  work_experience_years NUMERIC(4,1) DEFAULT 0,
  has_research BOOLEAN DEFAULT false,
  publications INTEGER DEFAULT 0,
  has_leadership BOOLEAN DEFAULT false,
  verified_via_doc BOOLEAN DEFAULT false,
  institution TEXT,
  plan TEXT DEFAULT 'explorer',
  role TEXT DEFAULT 'user',
  status TEXT DEFAULT 'active',
  confirmed_fields JSONB DEFAULT '[]'::jsonb,
  joined_at TEXT,
  updated_at TEXT,
  auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS scholarships (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  provider TEXT,
  host TEXT,
  country JSONB DEFAULT '[]'::jsonb,
  eligible_country_codes JSONB,
  degree_levels JSONB DEFAULT '[]'::jsonb,
  fields JSONB DEFAULT '[]'::jsonb,
  funding_type TEXT,
  amount TEXT,
  deadline TEXT,
  description TEXT,
  eligibility TEXT,
  required_documents JSONB DEFAULT '[]'::jsonb,
  apply_url TEXT,
  source_url TEXT,
  published BOOLEAN DEFAULT false,
  no_ielts BOOLEAN DEFAULT false,
  work_experience_required INTEGER,
  age_limit_masters INTEGER,
  age_limit_phd INTEGER,
  verified_at TEXT,
  view_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_id TEXT REFERENCES scholarships(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'Saved',
  priority TEXT DEFAULT 'Medium',
  notes TEXT,
  updated_at TEXT
);

CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  name TEXT,
  type TEXT,
  size TEXT,
  file_path TEXT,
  uploaded_at TEXT
);

CREATE TABLE IF NOT EXISTS essays (
  id TEXT PRIMARY KEY,
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  scholarship_name TEXT,
  essay_type TEXT,
  prompt TEXT,
  stage TEXT DEFAULT 'draft',
  draft TEXT,
  critique TEXT,
  final TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS bot_ingestions (
  id TEXT PRIMARY KEY,
  scholarship_name TEXT,
  provider TEXT,
  host TEXT,
  source_url TEXT,
  apply_url TEXT,
  status TEXT DEFAULT 'pending',
  confidence TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  user_email TEXT REFERENCES profiles(email) ON DELETE CASCADE,
  paystack_reference TEXT,
  paystack_subscription_code TEXT,
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'KES',
  plan TEXT,
  status TEXT DEFAULT 'pending',
  webhook_event_id TEXT,
  created_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  admin_email TEXT,
  action TEXT,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  ip_address TEXT,
  created_at TEXT
);
`;

async function execSQL(sql) {
  // Execute raw SQL via the supabase rpc function
  // Create the exec_sql function if it doesn't exist
  const { error: fnError } = await supabase.rpc('exec_sql', { sql_text: sql });
  if (fnError) {
    // Function doesn't exist yet - try creating it
    const createFnSQL = `
      CREATE OR REPLACE FUNCTION exec_sql(sql_text TEXT)
      RETURNS VOID AS $$
      BEGIN
        EXECUTE sql_text;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // We need to create the function first - this is a chicken-egg problem
    // For now, fall back to informing the user
    console.error('Could not execute SQL via RPC. The exec_sql function needs to be created first.');
    console.error('Please run the SQL in supabase/migrations/001_initial_schema.sql');
    console.error('via the Supabase Dashboard SQL Editor.');
    return false;
  }
  return true;
}

async function tableExists(tableName) {
  const { data, error } = await supabase
    .from(tableName)
    .select('count()', { count: 'exact', head: true });
  if (error && error.code === 'PGRST116') {
    // Relation does not exist
    return false;
  }
  if (error && error.message?.includes('does not exist')) {
    return false;
  }
  return true;
}

async function createTables() {
  console.log('\n--- Creating tables ---');
  
  // Try creating via exec_sql RPC (requires function to exist)
  const { error: rpcError } = await supabase.rpc('exec_sql', { sql_text: 'SELECT 1' });
  if (rpcError) {
    console.log('exec_sql RPC not available. Tables must be created manually.');
    console.log('Run the SQL in supabase/migrations/001_initial_schema.sql');
    console.log('via the Supabase Dashboard SQL Editor.\n');
    
    const answer = await ask('Have you already created the tables? (y/N): ');
    if (answer.toLowerCase() !== 'y') {
      console.log('Please create the tables first, then re-run this script.');
      process.exit(0);
    }
    return true;
  }
  
  await supabase.rpc('exec_sql', { sql_text: CREATE_TABLES_SQL });
  console.log('Tables created successfully.');
  return true;
}

async function seedData() {
  const dbPath = resolve(__dirname, '..', 'src', 'data', 'db.json');
  if (!existsSync(dbPath)) {
    console.log('No db.json found, skipping seed.');
    return;
  }
  
  const db = JSON.parse(readFileSync(dbPath, 'utf-8'));
  
  // --- Scholarships ---
  console.log(`\nSeeding ${db.scholarships?.length || 0} scholarships...`);
  for (const s of db.scholarships || []) {
    const { error } = await supabase.from('scholarships').upsert(s, { onConflict: 'id' });
    if (error) console.error(`  Failed schol ${s.id}:`, error.message);
  }
  
  // --- Profiles (skip password_hash) ---
  console.log(`Seeding ${db.users?.length || 0} profiles...`);
  for (const u of db.users || []) {
    const { password_hash, ...profile } = u;
    const { error } = await supabase.from('profiles').upsert(profile, { onConflict: 'email' });
    if (error) console.error(`  Failed profile ${u.email}:`, error.message);
  }
  
  // --- Applications ---
  console.log(`Seeding ${db.applications?.length || 0} applications...`);
  for (const a of db.applications || []) {
    const { error } = await supabase.from('applications').upsert(a, { onConflict: 'id' });
    if (error) console.error(`  Failed app ${a.id}:`, error.message);
  }
  
  // --- Documents ---
  console.log(`Seeding ${db.documents?.length || 0} documents...`);
  for (const d of db.documents || []) {
    const { error } = await supabase.from('documents').upsert(d, { onConflict: 'id' });
    if (error) console.error(`  Failed doc ${d.id}:`, error.message);
  }
  
  // --- Essays ---
  console.log(`Seeding ${db.essays?.length || 0} essays...`);
  for (const e of db.essays || []) {
    const { error } = await supabase.from('essays').upsert(e, { onConflict: 'id' });
    if (error) console.error(`  Failed essay ${e.id}:`, error.message);
  }
  
  // --- Bot Ingestions ---
  console.log(`Seeding ${db.bot_ingestions?.length || 0} bot ingestions...`);
  for (const bi of db.bot_ingestions || []) {
    const { error } = await supabase.from('bot_ingestions').upsert(bi, { onConflict: 'id' });
    if (error) console.error(`  Failed ingestion ${bi.id}:`, error.message);
  }
  
  // --- Payments ---
  console.log(`Seeding ${db.payments?.length || 0} payments...`);
  for (const p of db.payments || []) {
    const { error } = await supabase.from('payments').upsert(p, { onConflict: 'id' });
    if (error) console.error(`  Failed payment ${p.id}:`, error.message);
  }
  
  // --- Audit Logs ---
  console.log(`Seeding ${db.audit_logs?.length || 0} audit logs...`);
  for (const al of db.audit_logs || []) {
    const { error } = await supabase.from('audit_logs').upsert(al, { onConflict: 'id' });
    if (error) console.error(`  Failed audit ${al.id}:`, error.message);
  }
  
  console.log('\nSeed complete!');
}

async function verifyData() {
  console.log('\n--- Verification ---');
  
  const tables = ['profiles', 'scholarships', 'applications', 'documents', 'essays', 'bot_ingestions', 'payments', 'audit_logs'];
  
  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.log(`  ${table}: ERROR — ${error.message}`);
    } else {
      console.log(`  ${table}: ${count} rows`);
    }
  }
}

async function main() {
  console.log('=== Zawadi Supabase Setup ===');
  console.log(`URL: ${SUPABASE_URL}`);
  
  const tablesOk = await createTables();
  if (!tablesOk) {
    console.log('Skipping seed — tables not available.');
    process.exit(1);
  }
  
  await seedData();
  await verifyData();
  
  rl.close();
  console.log('\nDone!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
