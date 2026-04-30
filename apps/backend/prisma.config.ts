import { defineConfig } from 'prisma/config';
import { PrismaPg } from '@prisma/adapter-pg';

export default defineConfig({
  datasource: {
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      ssl: { rejectUnauthorized: false },
    }),
  },
});
