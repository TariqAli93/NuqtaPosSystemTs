/**
 * JWT signing and verification for Cloud API
 * Uses HS256 (HMAC-SHA256) for simplicity in Phase 8
 *
 * In production, consider:
 * - Using RS256 (RSA) for better key separation (public/private)
 * - Storing keys in secure vaults
 * - Rotating keys periodically
 */

import crypto from 'crypto';

// For Phase 8, use environment variable
// TODO: Move to secure vault in production
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

interface JwtPayload {
  [key: string]: any;
}

/**
 * Sign a JWT payload (HS256)
 * Returns: header.payload.signature (base64url encoded)
 */
export function signJwt(payload: JwtPayload): string {
  // Header
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  // Encode parts
  const headerEncoded = base64urlEncode(JSON.stringify(header));
  const payloadEncoded = base64urlEncode(JSON.stringify(payload));

  // Sign
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64url');

  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

/**
 * Verify JWT signature and return payload
 * Throws on invalid signature or format
 */
export function verifyJwt(token: string): JwtPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const [headerEncoded, payloadEncoded, signatureProvided] = parts;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerEncoded}.${payloadEncoded}`)
    .digest('base64url');

  if (signatureProvided !== expectedSignature) {
    throw new Error('JWT signature verification failed');
  }

  // Decode payload
  const payload = JSON.parse(
    Buffer.from(payloadEncoded, 'base64url').toString('utf-8')
  ) as JwtPayload;

  return payload;
}

/**
 * Extract JWT from Authorization header
 * Expects: "Bearer <token>"
 */
export function extractTokenFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Helper: base64url encode (no padding)
 */
function base64urlEncode(str: string): string {
  return Buffer.from(str, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
