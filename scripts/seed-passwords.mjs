// One-time migration: add bcrypt password_hash for all seed users
// Password used by persona buttons: "password123"
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const bcrypt = require('bcryptjs');

const DB_PATH = new URL('../src/data/db.json', import.meta.url).pathname;

async function main() {
  const db = JSON.parse(readFileSync(DB_PATH, 'utf8'));
  let updated = 0;

  for (const user of db.users) {
    if (!user.password_hash) {
      user.password_hash = await bcrypt.hash('password123', 12);
      updated++;
      console.log(`  Added password_hash for ${user.email}`);
    }
  }

  writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  console.log(`Done. ${updated} user(s) updated.`);
}

main().catch(console.error);
