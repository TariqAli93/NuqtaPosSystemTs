import type { IConflictRepository } from '../../interfaces/IConflictRepository.js';
import type { Conflict } from '../../entities/Conflict.js';

export interface ResolveConflictInput {
  conflictId: number;
  strategy: 'lww' | 'manual' | 'merge' | 'custom-rule' | 'auto';
  resolvedValue?: Record<string, any>;
  feedback?: string;
  resolvedBy?: number;
}

/**
 * Resolve Conflict Use Case
 *
 * Resolves a single conflict by applying the selected strategy
 * and marking it as resolved in the database.
 */
export class ResolveConflictUseCase {
  constructor(private conflictRepository: IConflictRepository) {}

  async execute(input: ResolveConflictInput): Promise<Conflict> {
    // Validate input
    if (!input.conflictId || input.conflictId < 1) {
      throw new Error('Invalid conflict ID');
    }

    const validStrategies = ['lww', 'manual', 'merge', 'custom-rule', 'auto'];
    if (!validStrategies.includes(input.strategy)) {
      throw new Error(`Invalid strategy: ${input.strategy}`);
    }

    // If resolving with merge/manual, must provide resolved value
    if ((input.strategy === 'merge' || input.strategy === 'manual') && !input.resolvedValue) {
      throw new Error(`Resolving with ${input.strategy} requires resolvedValue`);
    }

    // Get the conflict to ensure it exists
    const conflict = await this.conflictRepository.getConflictById(input.conflictId);
    if (!conflict) {
      throw new Error(`Conflict not found: ${input.conflictId}`);
    }

    // Resolve the conflict
    const resolved = await this.conflictRepository.resolveConflict(input.conflictId, {
      strategy: input.strategy,
      resolvedValue: input.resolvedValue,
      feedback: input.feedback,
      resolvedBy: input.resolvedBy,
    });

    return resolved;
  }
}
