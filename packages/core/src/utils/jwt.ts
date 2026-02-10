/**
 * JWT Utilities for signed authentication tokens
 *
 * Tokens carry user context + device info + expiry.
 * Designed for both Offline (Electron) and Cloud modes.
 */

export interface JwtPayload {
  // User identity
  userId: string;
  storeId: string;
  username: string;

  // Authorization
  roles: string[];
  permissions: string[];

  // Device/Platform context
  deviceId?: string; // Electron device ID
  mode: 'cloud' | 'offline';

  // Standard claims
  iat: number; // Issued at
  exp: number; // Expiration (seconds since epoch)
  iss?: string; // Issuer (e.g., 'nuqta-cloud' or 'nuqta-electron')

  // Optional: refresh token info
  refreshTokenId?: string;
}

export interface TokenPair {
  accessToken: string; // Short-lived, used for requests
  refreshToken?: string; // Long-lived, for offline storage
  expiresIn: number; // Access token TTL in seconds
}

/**
 * Decode JWT payload WITHOUT verification
 * Use only for extracting claims client-side when signature is pre-verified
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8'));

    return decoded as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Check if token is expired (client-side, no signature check)
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;

  // Check expiration with 10-second buffer
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + 10;
}

/**
 * Create access token claims (server-side, before signing)
 */
export function createAccessTokenPayload(
  userId: string,
  storeId: string,
  username: string,
  roles: string[],
  permissions: string[],
  mode: 'cloud' | 'offline',
  deviceId?: string,
  issuer?: string,
  ttlSeconds: number = 3600
): JwtPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    userId,
    storeId,
    username,
    roles,
    permissions,
    deviceId,
    mode,
    iat: now,
    exp: now + ttlSeconds,
    iss: issuer,
  };
}

/**
 * Create refresh token claims (server-side, before signing)
 * Refresh tokens are long-lived and only used to get new access tokens
 */
export function createRefreshTokenPayload(
  userId: string,
  storeId: string,
  refreshTokenId: string,
  mode: 'cloud' | 'offline',
  deviceId?: string,
  issuer?: string,
  ttlSeconds: number = 7 * 24 * 60 * 60 // 7 days
): JwtPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    userId,
    storeId,
    username: '', // Not included in refresh tokens
    roles: [],
    permissions: [],
    deviceId,
    mode,
    iat: now,
    exp: now + ttlSeconds,
    iss: issuer,
    refreshTokenId,
  };
}
