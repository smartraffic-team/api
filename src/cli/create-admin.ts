import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim();
  if (!email || !name || !password || password.length < 12)
    throw new Error(
      'Defina ADMIN_EMAIL, ADMIN_NAME e ADMIN_PASSWORD (12+ caracteres) no ambiente',
    );
  const prisma = new PrismaClient();
  try {
    if (
      await prisma.usuarios.count({ where: { nivel_acesso: 'ADMINISTRADOR' } })
    )
      throw new Error('Já existe administrador; use a API autenticada');
    const user = await prisma.usuarios.create({
      data: {
        email,
        nome: name,
        nivel_acesso: 'ADMINISTRADOR',
        senha_hash: await bcrypt.hash(password, 12),
      },
    });
    process.stdout.write(
      `Administrador criado: ${user.id.toString()} ${user.email}\n`,
    );
  } finally {
    await prisma.$disconnect();
  }
}
void main().catch((error: Error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
});
