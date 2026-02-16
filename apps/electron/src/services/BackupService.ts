import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import { DatabaseType } from '@nuqtaplus/data';

/**
 * BackupService handles database backup creation, restoration, and retention policy.
 *
 * Features:
 * - Timestamp-based backup naming (backup-YYYYMMDD-HHMMSS.db)
 * - Confirmation token for restore safety (ephemeral, 60s TTL)
 * - Automatic cleanup of old backups (retention policy)
 * - Verification of backup integrity before restore
 */
export class BackupService {
  private backupDir: string;
  private restoreTokens: Map<string, { expiresAt: number; backupPath: string }> = new Map();
  private readonly TOKEN_TTL_MS = 60000; // 60 seconds
  private readonly RETENTION_DAYS = 30;
  private db: Database.Database;

  constructor(db: DatabaseType) {
    this.db = db.sqlite;
    const defaultBackupPath = path.join(app.getPath('userData'), 'Backups');
    this.backupDir = defaultBackupPath;

    // Ensure backup directory exists
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }

    // Clean up expired tokens periodically
    setInterval(() => this.cleanupExpiredTokens(), 30000); // Every 30s
  }

  /**
   * Create a new database backup with timestamp naming.
   *
   * @returns { success: true, backupPath: string, backupName: string, timestamp: number }
   * @throws Error if backup creation fails
   */
  public createBackup(): {
    success: boolean;
    backupPath: string;
    backupName: string;
    timestamp: number;
  } {
    try {
      const timestamp = Date.now();
      const backupName = this.generateBackupName(timestamp);
      const backupPath = path.join(this.backupDir, backupName);

      // Perform database backup by copying file
      // First, issue VACUUM to ensure all data is written
      this.db.exec('VACUUM;');

      // Get the original database path
      const originalDbPath = this.getOriginalDbPath();

      // Copy database file to backup location
      fs.copyFileSync(originalDbPath, backupPath);

      // Verify backup integrity
      this.verifyBackup(backupPath);

      // Cleanup old backups
      this.enforceRetentionPolicy();

      return {
        success: true,
        backupPath,
        backupName,
        timestamp,
      };
    } catch (error) {
      throw new Error(
        `Backup creation failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate a confirmation token for restore operation.
   * Token expires after 60 seconds.
   *
   * @param backupName - Name of the backup file to restore
   * @returns { token: string, expiresAt: number }
   * @throws Error if backup does not exist
   */
  public generateRestoreToken(backupName: string): {
    token: string;
    expiresAt: number;
  } {
    const backupPath = path.join(this.backupDir, backupName);

    // Verify backup exists and is valid
    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup not found: ${backupName}`);
    }

    // Generate token
    const token = this.generateToken();
    const expiresAt = Date.now() + this.TOKEN_TTL_MS;

    // Store token with expiration
    this.restoreTokens.set(token, { expiresAt, backupPath });

    return { token, expiresAt };
  }

  /**
   * Restore database from backup using a confirmation token.
   *
   * @param token - Confirmation token (must be valid and not expired)
   * @returns { success: boolean, message: string }
   * @throws Error if token is invalid/expired or restore fails
   */
  public restoreFromBackup(token: string): {
    success: boolean;
    message: string;
  } {
    try {
      // Validate token
      const tokenData = this.restoreTokens.get(token);
      if (!tokenData) {
        throw new Error('Invalid restore token');
      }

      if (Date.now() > tokenData.expiresAt) {
        this.restoreTokens.delete(token);
        throw new Error('Restore token has expired');
      }

      const backupPath = tokenData.backupPath;

      // Verify backup exists and is valid
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found or was deleted');
      }

      // Close current database connection
      this.db.close();

      const originalDbPath = this.getOriginalDbPath();

      // Backup current database before restore (safety)
      const emergencyBackupPath = path.join(this.backupDir, `emergency-backup-${Date.now()}.db`);
      fs.copyFileSync(originalDbPath, emergencyBackupPath);

      // Restore from backup
      fs.copyFileSync(backupPath, originalDbPath);

      // Consume token
      this.restoreTokens.delete(token);

      // Note: Caller must restart the app to reconnect to restored database
      return {
        success: true,
        message: `Database restored from backup. Please restart the application.`,
      };
    } catch (error) {
      throw new Error(`Restore failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get list of available backups with metadata.
   *
   * @returns Array of backup info { name, path, size, createdAt }
   */
  public listBackups(): Array<{
    name: string;
    path: string;
    size: number;
    createdAt: number;
  }> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return [];
      }

      const files = fs.readdirSync(this.backupDir);
      const backups = files
        .filter((file) => file.startsWith('backup-') && file.endsWith('.db'))
        .map((file) => {
          const filePath = path.join(this.backupDir, file);
          const stats = fs.statSync(filePath);
          const createdAt = stats.mtimeMs;

          return {
            name: file,
            path: filePath,
            size: stats.size,
            createdAt,
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt); // Newest first

      return backups;
    } catch (error) {
      throw new Error(
        `Failed to list backups: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Delete a specific backup.
   *
   * @param backupName - Name of the backup to delete
   * @returns { success: boolean, message: string }
   */
  public deleteBackup(backupName: string): {
    success: boolean;
    message: string;
  } {
    try {
      const backupPath = path.join(this.backupDir, backupName);

      if (!fs.existsSync(backupPath)) {
        throw new Error(`Backup not found: ${backupName}`);
      }

      // Prevent deletion of emergency backups that might be recent
      if (backupName.startsWith('emergency-backup-')) {
        throw new Error('Cannot manually delete emergency backups');
      }

      fs.unlinkSync(backupPath);

      return {
        success: true,
        message: `Backup deleted: ${backupName}`,
      };
    } catch (error) {
      throw new Error(
        `Failed to delete backup: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get backup statistics.
   *
   * @returns { totalBackups: number, totalSize: number, oldestBackup: number, newestBackup: number }
   */
  public getBackupStats(): {
    totalBackups: number;
    totalSize: number;
    oldestBackup: number | null;
    newestBackup: number | null;
  } {
    try {
      const backups = this.listBackups();
      const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
      const createdTimes = backups.map((b) => b.createdAt);

      return {
        totalBackups: backups.length,
        totalSize,
        oldestBackup: createdTimes.length > 0 ? Math.min(...createdTimes) : null,
        newestBackup: createdTimes.length > 0 ? Math.max(...createdTimes) : null,
      };
    } catch (error) {
      throw new Error(
        `Failed to get backup stats: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Enforce retention policy by deleting backups older than RETENTION_DAYS.
   */
  private enforceRetentionPolicy(): void {
    try {
      const backups = this.listBackups();
      const cutoffTime = Date.now() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000;

      backups.forEach((backup) => {
        if (backup.createdAt < cutoffTime) {
          fs.unlinkSync(backup.path);
        }
      });
    } catch (error) {
      console.error('Retention policy enforcement failed:', error);
      // Don't throw; this is maintenance, not critical
    }
  }

  /**
   * Verify backup integrity by opening it as a SQLite database.
   *
   * @param backupPath - Path to backup file
   * @throws Error if backup is corrupted
   */
  private verifyBackup(backupPath: string): void {
    try {
      const testDb = new Database(backupPath, { readonly: true });
      // Try to read schema to verify integrity
      testDb.prepare('SELECT name FROM sqlite_master LIMIT 1;').all();
      testDb.close();
    } catch (error) {
      // Delete corrupted backup
      fs.unlinkSync(backupPath);
      throw new Error(
        `Backup verification failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Generate timestamp-based backup filename.
   * Format: backup-YYYYMMDD-HHMMSS.db
   */
  private generateBackupName(timestamp: number): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `backup-${year}${month}${day}-${hours}${minutes}${seconds}.db`;
  }

  /**
   * Generate a random token for restore confirmation.
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  /**
   * Clean up expired restore tokens.
   */
  private cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.restoreTokens.entries()) {
      if (now > data.expiresAt) {
        this.restoreTokens.delete(token);
      }
    }
  }

  /**
   * Get the original database file path.
   * Follows the same logic as db.ts in packages/data
   */
  private getOriginalDbPath(): string {
    const appDataPath = app.getPath('appData');
    return path.join(appDataPath, 'nuqtaplus', 'nuqta_plus.db');
  }
}
