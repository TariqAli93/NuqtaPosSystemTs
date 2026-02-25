import type { ApiResult } from './contracts';
import { invoke } from './invoke';
import { buildDataPayload } from './payloads';

export interface BackupInfo {
  name: string;
  size: number;
  createdAt: number;
}

export interface BackupStats {
  totalBackups: number;
  totalSize: number;
  oldestBackup: number | null;
  newestBackup: number | null;
}

export const backupClient = {
  /** Create a new backup of the current database */
  create: (): Promise<ApiResult<{ backupPath: string; backupName: string; timestamp: number }>> =>
    invoke<{ backupPath: string; backupName: string; timestamp: number }>('backup:create', {}),

  /** List all available backups */
  list: (): Promise<ApiResult<{ backups: BackupInfo[] }>> =>
    invoke<{ backups: BackupInfo[] }>('backup:list', {}),

  /** Generate a restore confirmation token */
  generateToken: (backupName: string): Promise<ApiResult<{ token: string; expiresAt: number }>> =>
    invoke<{ token: string; expiresAt: number }>(
      'backup:generateToken',
      buildDataPayload('backup:generateToken', { backupName })
    ),

  /** Restore from backup using a token */
  restore: (token: string): Promise<ApiResult<{ message: string }>> =>
    invoke<{ message: string }>('backup:restore', buildDataPayload('backup:restore', { token })),

  /** Delete a backup by name */
  delete: (backupName: string): Promise<ApiResult<{ message: string }>> =>
    invoke<{ message: string }>('backup:delete', { id: backupName }),

  /** Get backup statistics */
  getStats: (): Promise<ApiResult<{ stats: BackupStats }>> =>
    invoke<{ stats: BackupStats }>('backup:getStats', {}),
};
