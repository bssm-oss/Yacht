import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    try {
      this.logger.log('Running prisma db push to sync schema...');
      execSync('npx prisma db push --accept-data-loss', {
        cwd: process.cwd(),
        stdio: 'inherit',
      });
      this.logger.log('Schema synced successfully.');
    } catch (e) {
      this.logger.warn(`prisma db push failed: ${(e as Error).message}`);
    }
    await this.$connect();
  }
}
