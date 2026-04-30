import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const adapter = new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
      ssl: false,
    });
    super({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
  }

  async onModuleInit() {
    try {
      this.logger.log('Running prisma db push to sync schema...');
      execSync('npx prisma db push --accept-data-loss', {
        cwd: process.cwd(),
        stdio: 'inherit',
        env: { ...process.env },
      });
      this.logger.log('Schema synced successfully.');
    } catch (e) {
      this.logger.warn(`prisma db push failed: ${(e as Error).message}`);
    }
    await this.$connect();
  }
}
