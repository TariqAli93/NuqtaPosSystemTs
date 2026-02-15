import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { withTransaction } from '../db.js';

describe('withTransaction', () => {
  let sqlite: Database.Database;

  beforeEach(() => {
    sqlite = new Database(':memory:');
  });

  afterEach(() => {
    if (sqlite) {
      sqlite.close();
    }
  });

  it('returns value for synchronous callback', () => {
    const value = withTransaction(sqlite, () => 123);
    expect(value).toBe(123);
  });

  it('throws for async function callbacks', () => {
    const asyncFn = (async () => 123) as unknown as () => number;
    expect(() => withTransaction(sqlite, asyncFn)).toThrow(
      'Transaction function cannot be async'
    );
  });

  it('throws when callback returns a thenable', () => {
    const thenableFn = (() => Promise.resolve(123)) as unknown as () => number;
    expect(() => withTransaction(sqlite, thenableFn)).toThrow(
      'Transaction function cannot return a promise'
    );
  });
});
