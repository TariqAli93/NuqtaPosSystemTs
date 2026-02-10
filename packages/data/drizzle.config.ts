import type { Config } from 'drizzle-kit';

export default {
  schema: './src/schema/schema.ts',
  out: './drizzle',
  driver: 'better-sqlite',
  strict: true,
  verbose: true,
} satisfies Config;
