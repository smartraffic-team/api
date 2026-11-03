const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT 1 AS ok`
  .then(() => process.stdout.write('Conexão Prisma: OK\n'))
  .catch((error) => {
    process.stderr.write(`Conexão Prisma falhou: ${error.code || error.message}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
