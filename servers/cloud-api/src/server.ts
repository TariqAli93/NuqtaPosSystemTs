import Fastify from 'fastify';
import cors from '@fastify/cors';
import { productRoutes } from './routes/products';
import { saleRoutes } from './routes/sales';
import { authRoutes } from './routes/auth';
import { registerSyncRoutes } from './routes/sync.js';
import { SyncService } from './services/SyncService.js';
import { getDatabase } from './db.js';

const server = Fastify({
  logger: true,
});

server.register(cors, {
  origin: '*', // Configure safely in production
});

// Health Check
server.get('/health', async () => {
  return { status: 'ok', version: '2.0.0-cloud' };
});

const start = async () => {
  try {
    // Initialize database
    const db = getDatabase();

    // Register Routes
    server.register(productRoutes);
    server.register(saleRoutes);
    server.register(authRoutes);

    // Register sync routes with SyncService
    const syncService = new SyncService(db);
    await registerSyncRoutes(server, syncService);

    const port = parseInt(process.env.PORT || '3000');
    await server.listen({ port, host: '0.0.0.0' });
    console.log(`Cloud Server (Phase 8) listening on port ${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();
