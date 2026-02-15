import { FastifyInstance } from 'fastify';
import { GetProductsUseCase, ok, mapErrorToResult } from '@nuqtaplus/core';
import { SqliteProductRepository } from '@nuqtaplus/data';
import { createDb } from '@nuqtaplus/data';
import path from 'path';

const dbPath = path.join(process.cwd(), 'cloud.db');
const db = createDb(dbPath);

export async function productRoutes(fastify: FastifyInstance) {
  const productRepo = new SqliteProductRepository(db);
  const getProductsUseCase = new GetProductsUseCase(productRepo);

  fastify.get('/products', async (request, reply) => {
    try {
      const query = request.query as any;
      const params = {
        search: query.search,
        page: parseInt(query.page) || 1,
        limit: parseInt(query.limit) || 10,
        categoryId: query.categoryId ? parseInt(query.categoryId) : undefined,
      };

      const result = await getProductsUseCase.execute(params);
      return ok(result);
    } catch (error: unknown) {
      const apiResult = mapErrorToResult(error);
      const status = !apiResult.ok ? apiResult.error.status || 500 : 500;
      return reply.code(status).send(apiResult);
    }
  });
}
