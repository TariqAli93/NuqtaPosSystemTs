import { FastifyInstance } from 'fastify';
import { CreateSaleUseCase } from '@nuqtaplus/core';
import { SqliteSaleRepository } from '@nuqtaplus/data';
import { SqliteProductRepository } from '@nuqtaplus/data';
import { SqliteCustomerRepository } from '@nuqtaplus/data';
import { SqliteSettingsRepository } from '@nuqtaplus/data';
import { SqlitePaymentRepository } from '@nuqtaplus/data';
import { createDb } from '@nuqtaplus/data';
import path from 'path';

// Reusing the same db instance strategy (in real app, use dependency injection container)
const dbPath = path.join(process.cwd(), 'cloud.db');
const db = createDb(dbPath);

export async function saleRoutes(fastify: FastifyInstance) {
  // Logic is Identical to Electron Handler - JUST THE DELIVERY MECHANISM CHANGES
  const saleRepo = new SqliteSaleRepository(db);
  const productRepo = new SqliteProductRepository(db);
  const customerRepo = new SqliteCustomerRepository(db);
  const settingsRepo = new SqliteSettingsRepository(db);
  const paymentRepo = new SqlitePaymentRepository(db);

  const createSaleUseCase = new CreateSaleUseCase(
    saleRepo,
    productRepo,
    customerRepo,
    settingsRepo,
    paymentRepo
  );

  fastify.post('/sales', async (request, reply) => {
    try {
      const data = request.body as any;
      // Extract User ID from Auth Middleware (assuming it exists in request.user)
      const userId = (request as any).user?.id || 1;

      const result = await createSaleUseCase.execute(data, userId);
      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(400).send({ error: error.message });
    }
  });
}
