import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { schema } from '@nuqtaplus/data';

import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

import {
  SqliteProductRepository,
  SqliteSaleRepository,
  SqliteAuditRepository,
  SqliteSettingsRepository,
} from '@nuqtaplus/data';

// We need to point to the actual migration folder of packages/data
const MIGRATIONS_FOLDER = path.resolve(__dirname, '../../../../packages/data/drizzle');

export interface TestContext {
  db: ReturnType<typeof drizzle>;
  sqlite: Database.Database;
  repositories: {
    product: SqliteProductRepository;
    sale: SqliteSaleRepository;
    audit: SqliteAuditRepository;
    settings: SqliteSettingsRepository;
  };
  cleanup: () => void;
}

export async function createTestDb(): Promise<TestContext> {
  const dbName = `test-ipc-${randomUUID()}.db`;
  const dbPath = path.join(os.tmpdir(), dbName);

  const sqlite = new Database(dbPath);

  // Dynamic import of schema from @nuqtaplus/data might be tricky if it's ESM only
  // We can try to rely on the package export
  // We can try to rely on the package export
  const db = drizzle(sqlite, { schema }); // Schema object needed for query builder? Yes.

  // Run migrations
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });

  const repositories = {
    product: new SqliteProductRepository(db),
    sale: new SqliteSaleRepository(db),
    audit: new SqliteAuditRepository(db),
    settings: new SqliteSettingsRepository(db),
  };

  return {
    db,
    sqlite,
    repositories,
    cleanup: () => {
      sqlite.close();
      if (fs.existsSync(dbPath)) {
        try {
          fs.unlinkSync(dbPath);
        } catch (e) {}
      }
    },
  };
}
