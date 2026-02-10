import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { DbConnection } from '@nuqtaplus/data';

/**
 * Apply Drizzle migrations to the database.
 *
 * This function is idempotent - safe to call on every startup.
 * Drizzle tracks applied migrations internally via __drizzle_migrations table.
 *
 * @param dbConnection - The database connection from createDb()
 * @throws Error if migrations fail to apply
 */
export function applyMigrations(dbConnection: DbConnection): void {
  try {
    console.log('[DB] Applying migrations...');

    // In development: migrations are at packages/data/drizzle
    // In production: migrations must be bundled/copied to accessible location
    // electron-builder should copy drizzle/ folder to resources or app.asar.unpacked

    let migrationsFolder: string;

    if (process.env.NODE_ENV === 'production') {
      // In packaged app: migrations should be in resources/drizzle
      // electron-builder extraResources copies them
      migrationsFolder = path.join(process.resourcesPath, 'drizzle');
    } else {
      // In development: relative path from electron/out/main to packages/data/drizzle
      // out/main -> out -> apps/electron -> apps -> project root -> packages/data/drizzle
      migrationsFolder = path.resolve(__dirname, '../../../../packages/data/drizzle');
    }

    console.log('[DB] Migrations folder:', migrationsFolder);

    // Run Drizzle migrations
    migrate(dbConnection.db, { migrationsFolder });

    console.log('[DB] Migrations applied successfully.');

    // Verify critical tables exist
    const tables = dbConnection.sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%' ORDER BY name;`
      )
      .all() as Array<{ name: string }>;

    console.log('[DB] Tables created:', tables.map((t) => t.name).join(', '));

    if (tables.length === 0) {
      throw new Error('No tables created after migrations - migration files may be missing');
    }
  } catch (error: any) {
    console.error('[DB] Migration failed:', error.message);
    throw new Error(`Database migration failed: ${error.message}`);
  }
}
