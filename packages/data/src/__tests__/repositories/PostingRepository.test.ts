import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb, TestContext } from '../test-harness';
import { SqlitePostingRepository } from '../../repositories/SqlitePostingRepository';

describe('SqlitePostingRepository', () => {
  let ctx: TestContext;
  let postingRepo: SqlitePostingRepository;

  beforeEach(async () => {
    ctx = await createTestDb();
    postingRepo = new SqlitePostingRepository(ctx.db as any);
  });

  afterEach(() => {
    ctx.cleanup();
  });

  it('persists and reads posting batch status', () => {
    const created = postingRepo.createBatch({
      periodType: 'day',
      periodStart: '2026-02-01',
      periodEnd: '2026-02-01',
      entriesCount: 0,
      totalAmount: 0,
      status: 'draft',
      postedBy: 1,
      notes: 'draft batch',
    });

    expect(created.status).toBe('draft');

    const fetched = postingRepo.getBatchById(created.id!);
    expect(fetched?.status).toBe('draft');

    postingRepo.lockBatch(created.id!);
    const locked = postingRepo.getBatchById(created.id!);
    expect(locked?.status).toBe('locked');

    postingRepo.unlockBatch(created.id!);
    const unlocked = postingRepo.getBatchById(created.id!);
    expect(unlocked?.status).toBe('posted');
  });
});
