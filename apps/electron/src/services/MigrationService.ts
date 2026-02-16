import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import { DbConnection } from '@nuqtaplus/data';

export function applyMigrations(dbConnection: DbConnection): void {
  try {
    let migrationsFolder: string;

    if (process.env.NODE_ENV === 'production') {
      migrationsFolder = path.join(process.resourcesPath, 'drizzle');
    } else {
      migrationsFolder = path.resolve(__dirname, '../../../../packages/data/drizzle');
    }

    migrate(dbConnection.db, { migrationsFolder });

    const tables = dbConnection.sqlite
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle_%' ORDER BY name;`
      )
      .all() as Array<{ name: string }>;

    if (tables.length === 0) {
      throw new Error('No tables created after migrations - migration files may be missing');
    }
  } catch (error: any) {
    throw new Error(`Database migration failed: ${error.message}`);
  }
}
