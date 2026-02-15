import { FastifyInstance } from 'fastify';
import { ok, failWith, mapErrorToResult } from '@nuqtaplus/core';
import { SyncService } from '../services/SyncService.js';
import { DeviceRegisterRequest, SyncPushRequest, SyncPullRequest } from '../types/sync.js';

/**
 * Register cloud sync routes with Fastify.
 *
 * Endpoints:
 * - POST /sync/register - Register new device
 * - POST /sync/push - Push changes to server
 * - POST /sync/pull - Pull changes from server
 * - GET /sync/status - Get sync status
 * - GET /sync/stats - Get sync statistics (admin)
 */
export async function registerSyncRoutes(fastify: FastifyInstance, syncService: SyncService) {
  /**
   * POST /sync/register
   * Register a new device for cloud sync.
   *
   * Body: DeviceRegisterRequest
   * Response: DeviceRegisterResponse
   */
  fastify.post('/sync/register', async (request, reply) => {
    try {
      const body = request.body as DeviceRegisterRequest;

      // Validate input
      if (!body.name || !body.type || !body.version || !body.platform) {
        return reply
          .status(400)
          .send(
            failWith(
              'VALIDATION_ERROR',
              'Missing required fields: name, type, version, platform',
              400
            )
          );
      }

      const result = await syncService.registerDevice(body);

      return reply.status(201).send(ok(result));
    } catch (error: unknown) {
      fastify.log.error('Register device error:', error);
      const apiResult = mapErrorToResult(error);
      return reply.status(500).send(apiResult);
    }
  });

  /**
   * POST /sync/push
   * Push local changes from device to server.
   *
   * Body: SyncPushRequest (includes deviceId, apiKey, changes)
   * Response: SyncPushResponse
   *
   * Headers:
   * - X-Device-ID: Device ID
   * - X-API-Key: API key
   */
  fastify.post('/sync/push', async (request, reply) => {
    try {
      const body = request.body as SyncPushRequest;

      // Validate authentication
      if (!body.deviceId || !body.apiKey) {
        return reply
          .status(401)
          .send(failWith('AUTH_FAILED', 'Missing authentication: deviceId or apiKey', 401));
      }

      // Validate input
      if (!Array.isArray(body.changes)) {
        return reply
          .status(400)
          .send(failWith('VALIDATION_ERROR', 'Invalid request: changes must be an array', 400));
      }

      const result = await syncService.pushChanges(body);

      return reply.status(200).send(ok(result));
    } catch (error: unknown) {
      fastify.log.error('Push changes error:', error);
      const apiResult = mapErrorToResult(error);
      const status =
        !apiResult.ok && error instanceof Error && error.message.includes('Authentication')
          ? 401
          : 500;
      return reply.status(status).send(apiResult);
    }
  });

  /**
   * POST /sync/pull
   * Pull remote changes from server to device.
   *
   * Body: SyncPullRequest (includes deviceId, apiKey, fromCursorId)
   * Response: SyncPullResponse
   *
   * Query Parameters:
   * - limit: Max changes to fetch (default: 1000)
   */
  fastify.post('/sync/pull', async (request, reply) => {
    try {
      const body = request.body as SyncPullRequest;

      // Validate authentication
      if (!body.deviceId || !body.apiKey) {
        return reply
          .status(401)
          .send(failWith('AUTH_FAILED', 'Missing authentication: deviceId or apiKey', 401));
      }

      const result = await syncService.pullChanges(body);

      return reply.status(200).send(ok(result));
    } catch (error: unknown) {
      fastify.log.error('Pull changes error:', error);
      const apiResult = mapErrorToResult(error);
      const status =
        !apiResult.ok && error instanceof Error && error.message.includes('Authentication')
          ? 401
          : 500;
      return reply.status(status).send(apiResult);
    }
  });

  /**
   * GET /sync/status
   * Get current sync status for device.
   *
   * Query Parameters:
   * - deviceId: Device ID
   * - apiKey: API key
   */
  fastify.get('/sync/status', async (request, reply) => {
    try {
      const query = request.query as Record<string, string>;
      const { deviceId, apiKey } = query;

      // Validate input
      if (!deviceId || !apiKey) {
        return reply
          .status(400)
          .send(failWith('VALIDATION_ERROR', 'Missing query parameters: deviceId, apiKey', 400));
      }

      const status = await syncService.getSyncStatus(deviceId, apiKey);

      return reply.status(200).send(ok(status));
    } catch (error: unknown) {
      fastify.log.error('Get sync status error:', error);
      const apiResult = mapErrorToResult(error);
      const httpStatus =
        !apiResult.ok && error instanceof Error && error.message.includes('Authentication')
          ? 401
          : 500;
      return reply.status(httpStatus).send(apiResult);
    }
  });

  /**
   * GET /sync/stats
   * Get global sync statistics (admin endpoint).
   *
   * Admin token required (future: add auth middleware)
   */
  fastify.get('/sync/stats', async (request, reply) => {
    try {
      const stats = await syncService.getSyncStats();

      return reply.status(200).send(ok(stats));
    } catch (error: unknown) {
      fastify.log.error('Get sync stats error:', error);
      const apiResult = mapErrorToResult(error);
      return reply.status(500).send(apiResult);
    }
  });

  /**
   * POST /sync/suspend/:deviceId
   * Suspend device (admin endpoint).
   *
   * Params: deviceId
   */
  fastify.post('/sync/suspend/:deviceId', async (request, reply) => {
    try {
      const { deviceId } = request.params as Record<string, string>;

      await syncService.suspendDevice(deviceId);

      return reply.status(200).send(ok({ message: `Device ${deviceId} suspended` }));
    } catch (error: unknown) {
      fastify.log.error('Suspend device error:', error);
      const apiResult = mapErrorToResult(error);
      return reply.status(500).send(apiResult);
    }
  });

  /**
   * DELETE /sync/:deviceId
   * Delete device (admin endpoint).
   *
   * Params: deviceId
   */
  fastify.delete('/sync/:deviceId', async (request, reply) => {
    try {
      const { deviceId } = request.params as Record<string, string>;

      await syncService.deleteDevice(deviceId);

      return reply.status(200).send(ok({ message: `Device ${deviceId} deleted` }));
    } catch (error: unknown) {
      fastify.log.error('Delete device error:', error);
      const apiResult = mapErrorToResult(error);
      return reply.status(500).send(apiResult);
    }
  });
}
