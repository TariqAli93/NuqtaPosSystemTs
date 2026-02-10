import type { IConflictRepository } from '../../interfaces/IConflictRepository.js';
import type { ConflictStats } from '../../entities/Conflict.js';

export interface GetConflictStatsInput {
  fromDate?: number; // Unix timestamp
  toDate?: number; // Unix timestamp
}

/**
 * Get Conflict Stats Use Case
 *
 * Retrieves aggregated statistics about conflicts.
 * Useful for dashboards and monitoring.
 */
export class GetConflictStatsUseCase {
  constructor(private conflictRepository: IConflictRepository) {}

  async execute(input?: GetConflictStatsInput): Promise<ConflictStats> {
    // Build date range if provided
    const dateRange =
      input?.fromDate && input?.toDate
        ? {
            from: input.fromDate,
            to: input.toDate,
          }
        : undefined;

    // Query repository
    const stats = await this.conflictRepository.getStats(dateRange);

    return stats;
  }
}
