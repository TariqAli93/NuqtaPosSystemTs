import { FastifyInstance } from 'fastify';
import { LoginUseCase, ok, failWith, mapErrorToResult } from '@nuqtaplus/core';
import { CheckInitialSetupUseCase } from '@nuqtaplus/core';
import { RegisterFirstUserUseCase } from '@nuqtaplus/core';
import { UpdateUserUseCase } from '@nuqtaplus/core';
import { SqliteUserRepository } from '@nuqtaplus/data';
import { SqliteSettingsRepository } from '@nuqtaplus/data';
import { createDb } from '@nuqtaplus/data';
import { signJwt, createAccessTokenPayload, createRefreshTokenPayload } from '../services/jwt.js';
import path from 'path';

const dbPath = path.join(process.cwd(), 'cloud.db');
const db = createDb(dbPath);

// Simple in-memory refresh token blacklist (Phase 8)
// TODO: Move to DB table in production
const refreshTokenBlacklist = new Set<string>();

export async function authRoutes(fastify: FastifyInstance) {
  const userRepo = new SqliteUserRepository(db);
  const settingsRepo = new SqliteSettingsRepository(db);

  const loginUseCase = new LoginUseCase(userRepo);
  const checkInitialSetupUseCase = new CheckInitialSetupUseCase(userRepo, settingsRepo);
  const registerFirstUserUseCase = new RegisterFirstUserUseCase(userRepo);
  const updateUserUseCase = new UpdateUserUseCase(userRepo);

  /**
   * POST /auth/login
   * Authenticate user and return JWT tokens
   */
  fastify.post('/auth/login', async (request, reply) => {
    try {
      const credentials = request.body as any;
      const result = await loginUseCase.execute(credentials);

      if (!result.user || !result.user.id) {
        return reply.code(401).send(failWith('AUTH_FAILED', 'Invalid credentials', 401));
      }

      // Create access token payload
      const accessTokenPayload = createAccessTokenPayload(
        String(result.user.id),
        result.user.storeId || 'default',
        result.user.username,
        [result.user.role],
        result.permissions || [],
        'cloud', // mode
        undefined, // deviceId
        'nuqta-cloud', // issuer
        3600 // 1 hour TTL
      );

      // Create refresh token payload
      const refreshTokenId = crypto.randomUUID?.() || Math.random().toString(36);
      const refreshTokenPayload = createRefreshTokenPayload(
        String(result.user.id),
        result.user.storeId || 'default',
        refreshTokenId,
        'cloud',
        undefined,
        'nuqta-cloud',
        7 * 24 * 60 * 60 // 7 days
      );

      // Sign tokens
      const accessToken = signJwt(accessTokenPayload);
      const refreshToken = signJwt(refreshTokenPayload);

      return ok({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: {
          id: result.user.id,
          username: result.user.username,
          role: result.user.role,
        },
      });
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      return reply.code(401).send(apiResult);
    }
  });

  /**
   * POST /auth/refresh
   * Refresh access token using refresh token
   */
  fastify.post('/auth/refresh', async (request, reply) => {
    try {
      const { refreshToken } = request.body as any;

      if (!refreshToken) {
        return reply.code(400).send(failWith('VALIDATION_ERROR', 'Refresh token is required', 400));
      }

      // Check if token is blacklisted
      if (refreshTokenBlacklist.has(refreshToken)) {
        return reply.code(401).send(failWith('AUTH_FAILED', 'Refresh token has been revoked', 401));
      }

      // Verify refresh token
      let refreshPayload;
      try {
        const { verifyJwt } = await import('../services/jwt.js');
        refreshPayload = verifyJwt(refreshToken);
      } catch (error: unknown) {
        return reply
          .code(401)
          .send(failWith('AUTH_FAILED', 'Invalid or expired refresh token', 401));
      }

      // Create new access token
      const accessTokenPayload = createAccessTokenPayload(
        refreshPayload.userId,
        refreshPayload.storeId,
        refreshPayload.username || '',
        refreshPayload.roles || [],
        refreshPayload.permissions || [],
        'cloud',
        refreshPayload.deviceId,
        'nuqta-cloud',
        3600
      );

      const accessToken = signJwt(accessTokenPayload);

      return ok({
        accessToken,
        expiresIn: 3600,
      });
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      return reply.code(500).send(apiResult);
    }
  });

  /**
   * POST /auth/logout
   * Logout user (revoke refresh token)
   */
  fastify.post('/auth/logout', async (request, reply) => {
    try {
      const { refreshToken } = request.body as any;

      if (refreshToken) {
        // Add to blacklist
        refreshTokenBlacklist.add(refreshToken);
      }

      return ok(null);
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      return reply.code(500).send(apiResult);
    }
  });

  /**
   * GET /auth/setup-status
   * Check if app is in initial setup mode
   */
  fastify.get('/auth/setup-status', async (request, reply) => {
    try {
      const result = await checkInitialSetupUseCase.execute();
      return ok(result);
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      return reply.code(500).send(apiResult);
    }
  });

  /**
   * POST /auth/first-user
   * Create first user during setup
   */
  fastify.post('/auth/first-user', async (request, reply) => {
    try {
      const userData = request.body as any;
      const result = await registerFirstUserUseCase.execute(userData);

      // Return tokens for first user
      const accessTokenPayload = createAccessTokenPayload(
        String(result.user.id),
        result.user.storeId || 'default',
        result.user.username,
        [result.user.role],
        result.permissions || [],
        'cloud',
        undefined,
        'nuqta-cloud',
        3600
      );

      const refreshTokenId = crypto.randomUUID?.() || Math.random().toString(36);
      const refreshTokenPayload = createRefreshTokenPayload(
        String(result.user.id),
        result.user.storeId || 'default',
        refreshTokenId,
        'cloud',
        undefined,
        'nuqta-cloud',
        7 * 24 * 60 * 60
      );

      const accessToken = signJwt(accessTokenPayload);
      const refreshToken = signJwt(refreshTokenPayload);

      return ok({
        accessToken,
        refreshToken,
        expiresIn: 3600,
        user: result.user,
      });
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      return reply.code(400).send(apiResult);
    }
  });

  /**
   * POST /auth/change-password
   * Change user password after verifying current credentials
   */
  fastify.post('/auth/change-password', async (request, reply) => {
    try {
      const { username, currentPassword, newPassword } = request.body as any;

      if (!username || !currentPassword || !newPassword) {
        return reply
          .code(400)
          .send(
            failWith(
              'VALIDATION_ERROR',
              'username, currentPassword and newPassword are required',
              400
            )
          );
      }

      const loginResult = await loginUseCase.execute({
        username,
        password: currentPassword,
      });

      if (!loginResult?.user?.id) {
        return reply.code(404).send(failWith('NOT_FOUND', 'User not found', 404));
      }

      await updateUserUseCase.execute(loginResult.user.id, { password: newPassword });

      return ok(null);
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      return reply.code(400).send(apiResult);
    }
  });
}
