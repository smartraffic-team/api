import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD (12+ caracteres) no ambiente');
  }

  const prisma = new PrismaClient();
  try {
    const user = await prisma.usuarios.findUnique({ where: { email } });
    if (!user || user.nivel_acesso !== 'ADMINISTRADOR' || !user.ativo) {
      throw new Error('Administrador ativo não encontrado');
    }
    await prisma.usuarios.update({
      where: { id: user.id },
      data: { senha_hash: await bcrypt.hash(password, 12) },
    });
    process.stdout.write(`Senha redefinida para ${user.email}\n`);
  } finally {
    await prisma.$disconnect();
  }
}

void main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
