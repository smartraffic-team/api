import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
    const rows = await this.$queryRaw<
      Array<{ delta: number }>
    >`SELECT TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) AS delta`;
    if (Math.abs(Number(rows[0]?.delta ?? 0)) > 1)
      throw new Error('MySQL deve operar em UTC');
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
