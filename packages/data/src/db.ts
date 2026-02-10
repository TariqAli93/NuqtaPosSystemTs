import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/schema.js';

export type DbClient = BetterSQLite3Database<typeof schema>;

export type DbConnection = {
  db: DbClient;
  sqlite: Database.Database;
};

// Helper to initialize DB
export function createDb(sqlitePath: string): DbConnection {
  const sqlite = new Database(sqlitePath);

  // Pragmas: stable defaults for desktop POS
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('synchronous = NORMAL');

  const db = drizzle(sqlite, { schema });

  return { db, sqlite };
}

/**
 * Transaction wrapper using better-sqlite3 native transactions.
 * NOTE: Use this for multi-write atomic workflows.
 *
 * IMPORTANT: Only pass SYNCHRONOUS functions.
 * For async operations, use Drizzle ORM's built-in db.transaction(...) instead.
 *
 * @param sqlite - Must be a better-sqlite3 Database instance
 * @param fn - Synchronous function with side effects
 * @throws Error if sqlite is not a real better-sqlite3 instance
 */
export function withTransaction<T>(sqlite: Database.Database, fn: () => T): T {
  // Runtime guard: verify we have the correct type
  if (!sqlite || typeof sqlite.transaction !== 'function') {
    throw new Error(
      `[withTransaction] Expected better-sqlite3 Database instance, got ${typeof sqlite}. ` +
        'Did you pass conn.db (Drizzle) instead of conn.sqlite (better-sqlite3)? ' +
        'For async operations, use Drizzle ORM db.transaction(...) instead.'
    );
  }

  // Verify we're not getting an async function
  if (fn.constructor.name === 'AsyncFunction') {
    throw new Error(
      '[withTransaction] Async functions are not supported. ' +
        'withTransaction uses better-sqlite3 synchronous transactions. ' +
        'For async operations, use Drizzle ORM db.transaction(...) instead.'
    );
  }

  return sqlite.transaction(fn)();
}
