import { FastifyInstance } from 'fastify';
import { GetProductsUseCase } from '@nuqtaplus/core';
import { SqliteProductRepository } from '@nuqtaplus/data';
import { createDb } from '@nuqtaplus/data';
import path from 'path';

// In a real cloud app, this would be a Postgres connection string
// For now, reusing the Sqlite logic for consistency with the "Cloud Server" requirement
// but operating on a specific "cloud" db file
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
      return result;
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });
}
