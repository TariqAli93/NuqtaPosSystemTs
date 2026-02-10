import { FastifyInstance } from 'fastify';
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
        return reply.status(400).send({
          success: false,
          error: 'Missing required fields: name, type, version, platform',
        });
      }

      const result = await syncService.registerDevice(body);

      return reply.status(201).send(result);
    } catch (error: any) {
      fastify.log.error('Register device error:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to register device',
      });
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
        return reply.status(401).send({
          success: false,
          error: 'Missing authentication: deviceId or apiKey',
        });
      }

      // Validate input
      if (!Array.isArray(body.changes)) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request: changes must be an array',
        });
      }

      const result = await syncService.pushChanges(body);

      return reply.status(200).send(result);
    } catch (error: any) {
      fastify.log.error('Push changes error:', error);

      // Authentication error
      if (error.message.includes('Authentication')) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication failed',
        });
      }

      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to push changes',
      });
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
        return reply.status(401).send({
          success: false,
          error: 'Missing authentication: deviceId or apiKey',
        });
      }

      const result = await syncService.pullChanges(body);

      return reply.status(200).send(result);
    } catch (error: any) {
      fastify.log.error('Pull changes error:', error);

      // Authentication error
      if (error.message.includes('Authentication')) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication failed',
        });
      }

      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to pull changes',
      });
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
        return reply.status(400).send({
          success: false,
          error: 'Missing query parameters: deviceId, apiKey',
        });
      }

      const status = await syncService.getSyncStatus(deviceId, apiKey);

      return reply.status(200).send({
        success: true,
        status,
      });
    } catch (error: any) {
      fastify.log.error('Get sync status error:', error);

      if (error.message.includes('Authentication')) {
        return reply.status(401).send({
          success: false,
          error: 'Authentication failed',
        });
      }

      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get sync status',
      });
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

      return reply.status(200).send({
        success: true,
        stats,
      });
    } catch (error: any) {
      fastify.log.error('Get sync stats error:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to get sync stats',
      });
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

      return reply.status(200).send({
        success: true,
        message: `Device ${deviceId} suspended`,
      });
    } catch (error: any) {
      fastify.log.error('Suspend device error:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to suspend device',
      });
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

      return reply.status(200).send({
        success: true,
        message: `Device ${deviceId} deleted`,
      });
    } catch (error: any) {
      fastify.log.error('Delete device error:', error);
      return reply.status(500).send({
        success: false,
        error: error.message || 'Failed to delete device',
      });
    }
  });
}
