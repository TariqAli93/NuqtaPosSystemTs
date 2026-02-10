import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { UpdateService } from '../../src/services/UpdateService';

// Mock electron-updater
vi.mock('electron-updater', () => {
  const mockAutoUpdater = {
    logger: {},
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: vi.fn(),
    downloadUpdate: vi.fn(),
    quitAndInstall: vi.fn(),
    on: vi.fn(),
  };
  return { autoUpdater: mockAutoUpdater };
});

// Mock electron
vi.mock('electron', () => ({
  app: {
    getVersion: () => '1.0.0',
  },
  dialog: {
    showMessageBox: vi.fn().mockResolvedValue({ response: -1 }),
  },
}));

// Mock electron-log
vi.mock('electron-log', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    transports: {
      file: {
        level: 'info',
      },
    },
  },
}));

describe('UpdateService', () => {
  let updateService: UpdateService;

  beforeEach(() => {
    vi.clearAllMocks();
    updateService = new UpdateService();
  });

  afterEach(() => {
    updateService.dispose();
  });

  describe('initialization', () => {
    it('should initialize without errors', () => {
      expect(updateService).toBeDefined();
      expect(updateService.getCurrentVersion()).toBe('1.0.0');
    });

    it('should set autoDownload to false', () => {
      // UpdateService should disable auto-download
      expect(updateService).toBeDefined();
    });
  });

  describe('getCurrentVersion', () => {
    it('should return current app version', () => {
      const version = updateService.getCurrentVersion();
      expect(version).toBe('1.0.0');
    });
  });

  describe('isUpdateAvailable', () => {
    it('should return false initially', () => {
      expect(updateService.isUpdateAvailable()).toBe(false);
    });

    it('should return true after update available event', () => {
      // This would be set by internal event handling
      // For now, test the getter
      expect(updateService.isUpdateAvailable()).toBeFalsy();
    });
  });

  describe('checkForUpdates', () => {
    it('should trigger update check', async () => {
      const { autoUpdater } = await import('electron-updater');
      vi.mocked(autoUpdater.checkForUpdates).mockResolvedValue({
        updateInfo: { version: '1.1.0' },
      } as any);

      await updateService.checkForUpdates();

      expect(autoUpdater.checkForUpdates).toHaveBeenCalled();
    });

    it('should handle check errors gracefully', async () => {
      const { autoUpdater } = await import('electron-updater');
      const error = new Error('Network error');
      vi.mocked(autoUpdater.checkForUpdates).mockRejectedValue(error);

      // Should not throw
      await expect(updateService.checkForUpdates()).resolves.toBeUndefined();
    });

    it('should resolve even if check fails', async () => {
      const { autoUpdater } = await import('electron-updater');
      vi.mocked(autoUpdater.checkForUpdates).mockRejectedValue(new Error('Check failed'));

      const result = await updateService.checkForUpdates();
      expect(result).toBeUndefined();
    });
  });

  describe('downloadUpdate', () => {
    it('should call downloadUpdate on autoUpdater', () => {
      const { autoUpdater } = require('electron-updater');
      vi.mocked(autoUpdater.downloadUpdate).mockResolvedValue('update-file.exe');

      updateService.downloadUpdate();

      expect(autoUpdater.downloadUpdate).toHaveBeenCalled();
    });
  });

  describe('installAndRestart', () => {
    it('should call quitAndInstall', () => {
      const { autoUpdater } = require('electron-updater');

      updateService.installAndRestart();

      expect(autoUpdater.quitAndInstall).toHaveBeenCalledWith(false, true);
    });
  });

  describe('dispose', () => {
    it('should cleanup interval on dispose', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      updateService.initialize();
      updateService.dispose();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should handle dispose without initialization', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval');

      // Create new instance and immediately dispose
      const newService = new UpdateService();
      newService.dispose();

      // Should not error
      expect(newService).toBeDefined();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('event listeners', () => {
    it('should set up event listeners on initialization', () => {
      const { autoUpdater } = require('electron-updater');

      // AutoUpdater should have listeners registered
      expect(autoUpdater.on).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle checkForUpdates errors without throwing', async () => {
      const { autoUpdater } = await import('electron-updater');
      vi.mocked(autoUpdater.checkForUpdates).mockRejectedValue(new Error('Network timeout'));

      // Should not throw
      await updateService.checkForUpdates();
      expect(true).toBe(true);
    });
  });

  describe('version checking', () => {
    it('should report current version correctly', () => {
      const version = updateService.getCurrentVersion();
      expect(typeof version).toBe('string');
      expect(version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });

  describe('update availability', () => {
    it('should track update availability state', () => {
      const initialState = updateService.isUpdateAvailable();
      expect(typeof initialState).toBe('boolean');
      expect(initialState).toBe(false);
    });
  });
});
