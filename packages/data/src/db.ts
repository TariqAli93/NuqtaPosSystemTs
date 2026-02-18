import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema/schema.js';

export type DbClient = BetterSQLite3Database<typeof schema>;

export type DbConnection = {
  db: DbClient;
  sqlite: Database.Database;
};

type Thenable = {
  then: (...args: unknown[]) => unknown;
};

type SyncResult<T> = T extends PromiseLike<unknown> ? never : T;

// Helper to initialize DB
export function createDb(sqlitePath: string): DbConnection {
  const sqlite = new Database(sqlitePath, {
    verbose: process.env.SQLITE_VERBOSE ? console.log : undefined,
  });

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
 *
 * @param sqlite - Must be a better-sqlite3 Database instance
 * @param fn - Synchronous callback (must not return Promise)
 * @throws Error if sqlite is not a real better-sqlite3 instance
 */
export function withTransaction<T>(
  sqlite: Database.Database,
  fn: () => SyncResult<T>
): SyncResult<T> {
  if (!sqlite || typeof sqlite.transaction !== 'function') {
    throw new Error('[withTransaction] invalid sqlite instance');
  }

  const fnConstructorName = (fn as Function).constructor?.name;
  if (fnConstructorName === 'AsyncFunction') {
    throw new Error('Transaction function cannot be async. Use a synchronous callback.');
  }

  const wrapped = sqlite.transaction(() => {
    const result = fn();

    if (result && typeof (result as unknown as Thenable).then === 'function') {
      throw new Error('Transaction function cannot return a promise');
    }

    return result as SyncResult<T>;
  });

  return wrapped();
}
