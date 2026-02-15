import { FastifyInstance } from 'fastify';
import { CreateSaleUseCase, ok, mapErrorToResult } from '@nuqtaplus/core';
import type { ApiResult } from '@nuqtaplus/core';
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
  const saleRepo = new SqliteSaleRepository(db.db);
  const productRepo = new SqliteProductRepository(db.db);
  const customerRepo = new SqliteCustomerRepository(db.db);
  const settingsRepo = new SqliteSettingsRepository(db.db);
  const paymentRepo = new SqlitePaymentRepository(db.db);

  const createSaleUseCase = new CreateSaleUseCase(
    saleRepo,
    productRepo,
    customerRepo,
    settingsRepo,
    paymentRepo
  );

  /**
   * POST /sales
   * Request body: CreateSaleInput (flat DTO, same shape as IPC { data: DTO })
   * Response: ApiResult<Sale>
   *
   * userId inferred from auth token, NOT from request body.
   */
  fastify.post('/sales', async (request, reply) => {
    try {
      const saleInput = request.body as any;
      // In cloud mode, userId comes from auth middleware (request.user)
      const userId = (request as any).user?.id || 1;

      const result = await createSaleUseCase.execute(saleInput, userId);
      return reply.code(201).send(ok(result));
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      const status = apiResult.ok === false ? apiResult.error.status || 400 : 400;
      return reply.code(status).send(apiResult);
    }
  });
}
