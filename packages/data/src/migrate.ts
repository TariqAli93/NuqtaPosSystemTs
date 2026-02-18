import path from 'path';
import os from 'os';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { createDb } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Default DB path (same as Electron main process)
const defaultDbPath = path.join(
  process.env.APPDATA || path.join(os.homedir(), '.config'),
  'CodelNuqtaPlus',
  'Databases',
  'nuqta_plus.db'
);

const dbPath = defaultDbPath;

const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const migrationsFolder = path.resolve(__dirname, '../drizzle');

console.log('[DB] Starting migration process');

console.log('[DB] Running migrations');
console.log('[DB] Database path:', dbPath);
console.log('[DB] Migrations folder:', migrationsFolder);

const conn = createDb(dbPath);

try {
  conn.sqlite.pragma('foreign_keys = ON');
  conn.sqlite.pragma('journal_mode = WAL');
  conn.sqlite.pragma('busy_timeout = 5000');
  migrate(conn.db, { migrationsFolder });
  console.log('[DB] Migrations applied successfully.');
} catch (error: any) {
  console.error('[DB] Migration failed:', error);
  process.exit(1);
} finally {
  conn.sqlite.close();
}
