/**
 * Electron Token Manager
 * Handles secure storage and management of authentication tokens for offline mode.
 * - Refresh token: stored encrypted in Electron safeStorage
 * - Access token: kept in memory only
 * Provides token getter that can be safely called from renderer
 */

import { app, safeStorage } from 'electron';
import path from 'path';
import fs from 'fs';
import { JwtService } from '@nuqtaplus/core';
import crypto from 'crypto';

export interface StoredTokens {
  refreshToken: string;
  refreshTokenId: string; // jti for rotation validation
  createdAt: number;
}

export class TokenManager {
  private jwtService: JwtService;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshTokenId: string | null = null;
  private tokenFilePath: string;
  private secret: string;

  constructor() {
    // Path to encrypted token storage
    this.tokenFilePath = path.join(app.getPath('userData'), '.tokens');

    // Generate or load a persistent secret for this device
    // Avoid safeStorage usage before app is ready
    if (app.isReady()) {
      this.secret = this.getOrCreateSecret();
      this.jwtService = new JwtService(this.secret, 900);
      this.loadStoredTokens();
    } else {
      this.secret = crypto.randomBytes(32).toString('hex');
      this.jwtService = new JwtService(this.secret, 900);
      app.whenReady().then(() => {
        this.secret = this.getOrCreateSecret();
        this.jwtService = new JwtService(this.secret, 900);
        this.loadStoredTokens();
      });
    }
  }

  /**
   * Get or create a device secret (stored encrypted)
   */
  private getOrCreateSecret(): string {
    if (!app.isReady()) {
      return crypto.randomBytes(32).toString('hex');
    }
    const secretPath = path.join(app.getPath('userData'), '.secret');

    try {
      if (fs.existsSync(secretPath)) {
        const encryptedSecret = fs.readFileSync(secretPath);
        return safeStorage.decryptString(encryptedSecret).toString();
      }
    } catch (err) {
      console.warn('Failed to load existing secret, creating new one');
    }

    // Create new secret
    const newSecret = crypto.randomBytes(32).toString('hex');
    const encrypted = safeStorage.encryptString(newSecret);
    fs.writeFileSync(secretPath, encrypted);
    return newSecret;
  }

  /**
   * Issue tokens after successful login
   */
  issueTokens(
    userId: number,
    role: string,
    permissions: string[]
  ): {
    accessToken: string;
    refreshToken: string;
  } {
    // Issue access token (short-lived, in memory)
    const accessToken = this.jwtService.sign({
      sub: userId,
      role,
      permissions,
    });
    this.accessToken = accessToken;

    // Issue refresh token (long-lived, 7 days, stored)
    const refreshService = new JwtService(this.secret, 604800); // 7 days
    const refreshToken = refreshService.sign({
      sub: userId,
      role,
      permissions,
    });
    const decoded = this.jwtService.decode(refreshToken);

    this.refreshToken = refreshToken;
    this.refreshTokenId = decoded?.jti || null;

    // Persist refresh token securely
    this.saveRefreshToken();

    return { accessToken, refreshToken };
  }

  /**
   * Refresh access token using refresh token
   */
  refreshAccessToken(): { accessToken: string; refreshToken: string } | null {
    if (!this.refreshToken) {
      return null;
    }

    // Verify refresh token (7-day expiry)
    const refreshService = new JwtService(this.secret, 604800);
    const payload = refreshService.verify(this.refreshToken);

    if (!payload) {
      this.clearTokens();
      return null;
    }

    // Issue new access token
    const accessToken = this.jwtService.sign({
      sub: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    });
    this.accessToken = accessToken;

    // Optionally rotate refresh token (new jti, same expiry remaining)
    const newRefreshToken = refreshService.sign({
      sub: payload.sub,
      role: payload.role,
      permissions: payload.permissions,
    });
    const decoded = this.jwtService.decode(newRefreshToken);

    this.refreshToken = newRefreshToken;
    this.refreshTokenId = decoded?.jti || null;
    this.saveRefreshToken();

    return { accessToken, refreshToken: newRefreshToken };
  }

  /**
   * Get current access token (for IPC calls)
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current refresh token (for re-authentication)
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Validate access token and return payload if valid
   */
  validateAccessToken(token: string) {
    return this.jwtService.verify(token);
  }

  /**
   * Clear all tokens (logout)
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    this.refreshTokenId = null;

    try {
      if (fs.existsSync(this.tokenFilePath)) {
        fs.unlinkSync(this.tokenFilePath);
      }
    } catch (err) {
      console.error('Failed to clear stored tokens:', err);
    }
  }

  /**
   * Save refresh token securely
   */
  private saveRefreshToken(): void {
    try {
      if (!app.isReady()) {
        return;
      }
      const data: StoredTokens = {
        refreshToken: this.refreshToken!,
        refreshTokenId: this.refreshTokenId!,
        createdAt: Date.now(),
      };

      const encrypted = safeStorage.encryptString(JSON.stringify(data));
      fs.writeFileSync(this.tokenFilePath, encrypted);
    } catch (err) {
      console.error('Failed to save refresh token:', err);
    }
  }

  /**
   * Load stored refresh token on startup
   */
  private loadStoredTokens(): void {
    try {
      if (!fs.existsSync(this.tokenFilePath)) {
        return;
      }

      const encrypted = fs.readFileSync(this.tokenFilePath);
      const data = JSON.parse(safeStorage.decryptString(encrypted)) as StoredTokens;

      // Validate token is not expired
      const refreshService = new JwtService(this.secret, 604800);
      const payload = refreshService.verify(data.refreshToken);

      if (payload && payload.jti === data.refreshTokenId) {
        this.refreshToken = data.refreshToken;
        this.refreshTokenId = data.refreshTokenId;

        // Don't restore access token - it's short-lived
        // User will get a new one on next IPC call if needed
      } else {
        // Token expired or invalid, clear it
        this.clearTokens();
      }
    } catch (err) {
      console.warn('Failed to load stored tokens:', err);
      this.clearTokens();
    }
  }
}

// Singleton instance
export const tokenManager = new TokenManager();
