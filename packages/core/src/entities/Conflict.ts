/**
 * Conflict Entity
 *
 * Represents a data conflict detected during cloud synchronization.
 * Stores information about conflicting changes from multiple devices
 * and tracks resolution status.
 */

export class Conflict {
  id?: number;
  changeLogId?: number;
  deviceId?: string;
  entityType?: string;
  entityId?: string | number;
  timestamp?: number;
  clientValue?: Record<string, any>;
  serverValue?: Record<string, any>;
  resolution?: 'pending' | 'server-wins' | 'client-wins' | 'merged' | 'custom';
  resolvedValue?: Record<string, any>;
  resolvedAt?: number;
  resolutionStrategy?: string;
  resolvedBy?: number;
  feedback?: string;
  relatedConflicts?: number[];
  precedence?: number;
  createdAt?: number;

  constructor(data: Partial<Conflict>) {
    Object.assign(this, data);
    this.createdAt = data.createdAt ?? Date.now();
    this.resolution = data.resolution ?? 'pending';
    this.timestamp = data.timestamp ?? this.createdAt;
  }

  /**
   * Check if conflict is still pending resolution
   */
  isPending(): boolean {
    return this.resolution === 'pending';
  }

  /**
   * Check if conflict has been resolved
   */
  isResolved(): boolean {
    return this.resolution !== 'pending' && this.resolvedAt !== undefined;
  }

  /**
   * Get the age of the conflict in milliseconds
   */
  getAge(): number {
    return Date.now() - (this.createdAt ?? this.timestamp ?? Date.now());
  }

  /**
   * Get age in human readable format
   */
  getAgeString(): string {
    const age = this.getAge();
    const hours = Math.floor(age / 3600000);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    const minutes = Math.floor(age / 60000);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  }

  /**
   * Determine if this conflict is likely auto-resolvable
   */
  canAutoResolve(): boolean {
    // Can't auto-resolve if values are identical
    if (JSON.stringify(this.clientValue) === JSON.stringify(this.serverValue)) {
      return true;
    }

    // Can't auto-resolve if different entity types modified
    return false;
  }

  /**
   * Get the differences between client and server values
   */
  getDifferences(): Record<string, { client: any; server: any }> {
    const differences: Record<string, { client: any; server: any }> = {};

    // Get all keys from both values
    const allKeys = new Set([
      ...Object.keys(this.clientValue || {}),
      ...Object.keys(this.serverValue || {}),
    ]);

    for (const key of allKeys) {
      const clientVal = (this.clientValue || {})[key];
      const serverVal = (this.serverValue || {})[key];

      if (JSON.stringify(clientVal) !== JSON.stringify(serverVal)) {
        differences[key] = {
          client: clientVal,
          server: serverVal,
        };
      }
    }

    return differences;
  }
}

/**
 * Conflict Statistics
 * Summary metrics for conflict tracking
 */
export interface ConflictStats {
  total: number;
  byStatus: {
    pending: number;
    resolved: number;
  };
  byResolution: Record<string, number>;
  byEntity: Record<string, number>;
  averageResolutionTime: number;
  oldestUnresolved: number;
}

/**
 * Conflict Suggestion
 * AI/Rule-generated suggestion for resolving a conflict
 */
export interface ConflictSuggestion {
  strategy: 'lww' | 'manual' | 'merge' | 'custom-rule' | 'auto';
  winner?: 'client' | 'server';
  reason: string;
  confidence: number; // 0-100
  mergedValue?: Record<string, any>;
  mergeLogic?: Record<string, string>;
}

/**
 * Conflict Page
 * Paginated list of conflicts with metadata
 */
export interface ConflictPage {
  conflicts: Conflict[];
  total: number;
  pending: number;
  resolved: number;
  hasMore: boolean;
  offset: number;
  limit: number;
}

/**
 * Resolution Rule
 * Business rules for automatic conflict resolution
 */
export interface ResolutionRule {
  id?: number;
  entityType: string;
  fieldName?: string;
  strategy: 'lww' | 'always-client' | 'always-server' | 'merge-concat' | 'merge-sum' | 'custom';
  condition?: Record<string, any>;
  createdAt?: number;
  updatedAt?: number;
}
