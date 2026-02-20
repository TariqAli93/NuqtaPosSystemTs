import { IPostingRepository } from '../../interfaces/IPostingRepository.js';
import { JournalEntry } from '../../entities/Accounting.js';
import { NotFoundError, InvalidStateError } from '../../errors/DomainErrors.js';
import { IAccountingRepository } from '../../interfaces/IAccountingRepository.js';

/**
 * ReverseEntryUseCase
 * Creates a reversing journal entry for a posted entry.
 *
 * Rules:
 * - Original entry must exist and be posted
 * - Original entry must not already be reversed
 * - Creates a new entry with opposite debit/credit and links via reversalOfId
 * - Marks original as isReversed = true
 */
export class ReverseEntryUseCase {
  constructor(
    private postingRepo: IPostingRepository,
    private accountingRepo: IAccountingRepository
  ) {}

  async execute(entryId: number, userId: number): Promise<JournalEntry> {
    // Get the original entry
    const original = await this.accountingRepo.getEntryById(entryId);
    if (!original) {
      throw new NotFoundError('Journal entry not found', { entryId });
    }

    if (!original.isPosted) {
      throw new InvalidStateError('Cannot reverse an unposted entry', { entryId });
    }

    if (original.isReversed) {
      throw new InvalidStateError('Entry is already reversed', { entryId });
    }

    // Check if the entry's posting batch is locked
    if (original.postingBatchId) {
      const isLocked = this.postingRepo.isBatchLocked(original.postingBatchId);
      if (isLocked) {
        throw new InvalidStateError('Cannot reverse entry in a locked posting batch', {
          entryId,
          postingBatchId: original.postingBatchId,
        });
      }
    }

    // Create the reversal entry via the posting repo
    const reversal = this.postingRepo.createReversalEntry(entryId, userId);
    return reversal;
  }
}
