import type { Conflict, ConflictPage, ConflictStats, ResolutionRule } from '../entities/Conflict';

/**
 * Conflict Repository Interface
 *
 * Defines the contract for accessing conflict data.
 * Implementations will handle database operations.
 */
export interface IConflictRepository {
  /**
   * Get all conflicts with optional filtering
   */
  getConflicts(filters: {
    status?: 'pending' | 'resolved';
    entityType?: string;
    deviceId?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConflictPage>;

  /**
   * Get a single conflict by ID
   */
  getConflictById(conflictId: number): Promise<Conflict | null>;

  /**
   * Get conflicts for a specific entity
   */
  getConflictsByEntity(entityType: string, entityId: string | number): Promise<Conflict[]>;

  /**
   * Get pending conflicts
   */
  getPendingConflicts(limit?: number): Promise<Conflict[]>;

  /**
   * Create a new conflict record
   */
  createConflict(conflict: Omit<Conflict, 'id' | 'createdAt'>): Promise<Conflict>;

  /**
   * Resolve a conflict
   */
  resolveConflict(
    conflictId: number,
    resolution: {
      strategy: string;
      resolvedValue?: Record<string, any>;
      feedback?: string;
      resolvedBy?: number;
    }
  ): Promise<Conflict>;

  /**
   * Resolve multiple conflicts
   */
  resolveBatch(
    resolutions: Array<{
      conflictId: number;
      strategy: string;
      resolvedValue?: Record<string, any>;
    }>
  ): Promise<Conflict[]>;

  /**
   * Get conflict statistics
   */
  getStats(dateRange?: { from: number; to: number }): Promise<ConflictStats>;

  /**
   * Delete a conflict (archive)
   */
  deleteConflict(conflictId: number): Promise<void>;

  /**
   * Mark related conflicts (cascading resolutions)
   */
  markRelatedConflicts(conflictId: number, relatedIds: number[]): Promise<void>;
}

/**
 * Resolution Rule Repository Interface
 *
 * Manages resolution rules for automatic conflict handling
 */
export interface IResolutionRuleRepository {
  /**
   * Get all active rules
   */
  getRules(entityType?: string): Promise<ResolutionRule[]>;

  /**
   * Get a specific rule
   */
  getRuleById(ruleId: number): Promise<ResolutionRule | null>;

  /**
   * Create a new rule
   */
  createRule(rule: Omit<ResolutionRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<ResolutionRule>;

  /**
   * Update an existing rule
   */
  updateRule(ruleId: number, updates: Partial<ResolutionRule>): Promise<ResolutionRule>;

  /**
   * Delete a rule
   */
  deleteRule(ruleId: number): Promise<void>;

  /**
   * Find matching rules for a conflict
   */
  findMatchingRules(entityType: string, fieldName?: string): Promise<ResolutionRule[]>;
}
