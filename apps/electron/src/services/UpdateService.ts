import { app, dialog } from 'electron';
import pkg from 'electron-updater';
const { autoUpdater } = pkg;
import log from 'electron-log';

/**
 * UpdateService handles app updates via electron-updater.
 *
 * Features:
 * - Auto-check for updates (configurable interval)
 * - Staged rollout support (gradually deploy to users)
 * - Automatic download + install
 * - User prompts for app restart
 * - Error recovery and logging
 *
 * Configuration via package.json:
 * "build": {
 *   "publish": {
 *     "provider": "github",
 *     "owner": "your-org",
 *     "repo": "nuqtaplus",
 *     "releaseType": "release|prerelease|draft"
 *   }
 * }
 */
export class UpdateService {
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
  private updateAvailable = false;

  constructor() {
    // Configure logging
    autoUpdater.logger = log;
    (autoUpdater.logger as any).transports.file.level = 'info';

    // Disable auto-download to let us handle it
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;

    this.setupListeners();
  }

  /**
   * Initialize update service.
   * Starts periodic checks and initial check.
   */
  public initialize(): void {
    log.info('[UpdateService] Initializing');

    // Check for updates on startup (delayed to let app load)
    setTimeout(() => {
      this.checkForUpdates();
    }, 5000);

    // Set up periodic check (every hour)
    this.checkInterval = setInterval(() => {
      this.checkForUpdates();
    }, this.CHECK_INTERVAL_MS);
  }

  /**
   * Manually trigger update check.
   * Returns promise that resolves when check completes.
   */
  public checkForUpdates(): Promise<void> {
    return new Promise((resolve) => {
      log.info('[UpdateService] Checking for updates');

      autoUpdater
        .checkForUpdates()
        .then((result) => {
          if (result?.updateInfo) {
            log.info(
              '[UpdateService] Update check complete. Update available:',
              result.updateInfo.version
            );
          } else {
            log.info('[UpdateService] No update available');
          }
          resolve();
        })
        .catch((error) => {
          log.error('[UpdateService] Update check failed:', error);
          resolve(); // Don't reject; check failures shouldn't crash app
        });
    });
  }

  /**
   * Download available update.
   */
  public downloadUpdate(): void {
    log.info('[UpdateService] Starting update download');

    autoUpdater
      .downloadUpdate()
      .then((file) => {
        log.info('[UpdateService] Update downloaded:', file);
      })
      .catch((error) => {
        log.error('[UpdateService] Download failed:', error);
        this.handleUpdateError('Download failed', `Failed to download update: ${error.message}`);
      });
  }

  /**
   * Install update and restart app.
   * On Windows: quits app for installer to run
   * On macOS/Linux: restarts app for new version to load
   */
  public installAndRestart(): void {
    log.info('[UpdateService] Installing update and restarting');

    try {
      autoUpdater.quitAndInstall(false, true);
    } catch (error) {
      log.error('[UpdateService] Install failed:', error);
      this.handleUpdateError('Install failed', 'Failed to install update');
    }
  }

  /**
   * Get current app version.
   */
  public getCurrentVersion(): string {
    return app.getVersion();
  }

  /**
   * Stop background checks.
   * Call during app shutdown.
   */
  public dispose(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check if update is available and ready to install.
   */
  public isUpdateAvailable(): boolean {
    return this.updateAvailable;
  }

  /**
   * Handle update check success.
   * Called by electron-updater when update is found.
   */
  private onUpdateAvailable(info: any): void {
    log.info('[UpdateService] Update available:', info.version);
    this.updateAvailable = true;

    const currentVersion = this.getCurrentVersion();
    const newVersion = info.version;

    // Prompt user
    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version (${newVersion}) is available.`,
        detail: `You are currently using version ${currentVersion}.\n\nWould you like to download and install the update now?`,
        buttons: ['Update Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          // User chose "Update Now"
          this.downloadUpdate();
        } else {
          log.info('[UpdateService] User deferred update');
        }
      });
  }

  /**
   * Handle update download completion.
   * Called by electron-updater when download finishes.
   */
  private onUpdateDownloaded(info: any): void {
    log.info('[UpdateService] Update download complete:', info.version);

    dialog
      .showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded and ready to install.',
        detail: `Version ${info.version} will be installed when you restart the app.\n\nRestart now?`,
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      })
      .then((result) => {
        if (result.response === 0) {
          // User chose "Restart Now"
          this.installAndRestart();
        } else {
          log.info('[UpdateService] User deferred restart');
          // Update will install on next quit
        }
      });
  }

  /**
   * Handle update errors.
   */
  private handleUpdateError(title: string, message: string): void {
    log.error('[UpdateService]', title, ':', message);

    dialog
      .showMessageBox({
        type: 'error',
        title,
        message,
        buttons: ['OK'],
      })
      .catch((error) => {
        log.error('[UpdateService] Failed to show error dialog:', error);
      });
  }

  /**
   * Set up event listeners for electron-updater.
   */
  private setupListeners(): void {
    autoUpdater.on('update-available', (info) => {
      this.onUpdateAvailable(info);
    });

    autoUpdater.on('update-downloaded', (info) => {
      this.onUpdateDownloaded(info);
    });

    autoUpdater.on('update-not-available', () => {
      log.info('[UpdateService] No update available');
    });

    autoUpdater.on('error', (error) => {
      log.error('[UpdateService] Update error:', error);
    });

    autoUpdater.on('download-progress', (progressObj) => {
      const progress = Math.round((progressObj.transferred / progressObj.total) * 100);
      log.info('[UpdateService] Download progress:', `${progress}%`);
    });
  }
}
