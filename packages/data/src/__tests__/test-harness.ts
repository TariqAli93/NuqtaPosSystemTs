import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import * as schema from '../schema/schema.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';

import { SqliteProductRepository } from '../repositories/SqliteProductRepository.js';
import { SqliteSaleRepository } from '../repositories/SqliteSaleRepository.js';
import { SqliteCustomerRepository } from '../repositories/SqliteCustomerRepository.js';
import { SqliteSettingsRepository } from '../repositories/SqliteSettingsRepository.js';
import { SqlitePaymentRepository } from '../repositories/SqlitePaymentRepository.js';
import { SqliteAuditRepository } from '../repositories/SqliteAuditRepository.js';

export interface TestContext {
  db: ReturnType<typeof drizzle>;
  sqlite: Database.Database;
  repositories: {
    product: SqliteProductRepository;
    sale: SqliteSaleRepository;
    customer: SqliteCustomerRepository;
    settings: SqliteSettingsRepository;
    payment: SqlitePaymentRepository;
    audit: SqliteAuditRepository;
  };
  cleanup: () => void;
}

export async function createTestDb(): Promise<TestContext> {
  const dbName = `test-${randomUUID()}.db`;
  const dbPath = path.join(os.tmpdir(), dbName);

  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite, { schema });

  // Run migrations
  // Adjust path to point to package's drizzle folder (relative to src/__tests__)
  // Assumes we are in packages/data/src/__tests__/test-harness.ts
  const migrationsFolder = path.resolve(__dirname, '../../drizzle');
  migrate(db, { migrationsFolder });

  const repositories = {
    product: new SqliteProductRepository(db),
    sale: new SqliteSaleRepository(db),
    customer: new SqliteCustomerRepository(db),
    settings: new SqliteSettingsRepository(db),
    payment: new SqlitePaymentRepository(db),
    audit: new SqliteAuditRepository(db),
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
        } catch (e) {
          // Ignore deletion errors on Windows if file is locked
        }
      }
    },
  };
}
