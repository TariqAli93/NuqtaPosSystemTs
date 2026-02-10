import type { IConflictRepository } from '../../interfaces/IConflictRepository.js';
import type { ConflictPage } from '../../entities/Conflict.js';

export interface GetConflictsInput {
  status?: 'pending' | 'resolved';
  entityType?: string;
  deviceId?: string;
  limit?: number;
  offset?: number;
}

/**
 * Get Conflicts Use Case
 *
 * Retrieves a paginated list of conflicts with optional filtering.
 * Used for displaying conflicts in dashboard and admin interfaces.
 */
export class GetConflictsUseCase {
  constructor(private conflictRepository: IConflictRepository) {}

  async execute(input: GetConflictsInput): Promise<ConflictPage> {
    // Apply defaults
    const limit = input.limit || 50;
    const offset = input.offset || 0;

    // Validate inputs
    if (limit < 1 || limit > 1000) {
      throw new Error('Limit must be between 1 and 1000');
    }
    if (offset < 0) {
      throw new Error('Offset must be non-negative');
    }

    // Query repository
    const conflicts = await this.conflictRepository.getConflicts({
      status: input.status,
      entityType: input.entityType,
      deviceId: input.deviceId,
      limit: limit + 1, // Fetch one extra to determine hasMore
      offset,
    });

    // Check if more results exist
    const hasMore = conflicts.conflicts.length > limit;
    if (hasMore) {
      conflicts.conflicts.pop(); // Remove the extra
    }

    conflicts.hasMore = hasMore;
    conflicts.limit = limit;
    conflicts.offset = offset;

    return conflicts;
  }
}
