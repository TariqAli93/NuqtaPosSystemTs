import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema.js';

let db: ReturnType<typeof drizzle> | null = null;

/**
 * Initialize and get database instance
 */
export function getDatabase() {
  if (!db) {
    // Use in-memory DB for cloud API (cloud-api manages its own data separately)
    const sqlite = new Database(':memory:');

    // Enable foreign keys
    sqlite.pragma('foreign_keys = ON');

    db = drizzle(sqlite, { schema });
  }

  return db;
}

/**
 * Initialize database schema
 * Run migrations if needed
 */
export async function initializeDatabase() {
  const database = getDatabase();

  // Schema is automatically created by drizzle
  // No explicit migration needed for in-memory DB

  return database;
}

export default getDatabase();
