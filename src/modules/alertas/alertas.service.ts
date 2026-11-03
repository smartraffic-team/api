import { ConflictException, Injectable } from '@nestjs/common';
import { bigintId } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AlertasService {
  constructor(private prisma: PrismaService) {}
  async transition(
    id: string,
    userId: string,
    action: 'reconhecer' | 'resolver',
  ) {
    const key = bigintId(id),
      now = new Date();
    return this.prisma.$transaction(async (tx) => {
      const result =
        action === 'reconhecer'
          ? await tx.alertas.updateMany({
              where: { id: key, situacao: 'ATIVO', ocorrido_em: { lte: now } },
              data: {
                situacao: 'RECONHECIDO',
                reconhecido_em: now,
                usuario_reconhecimento_id: BigInt(userId),
              },
            })
          : await tx.alertas.updateMany({
              where: {
                id: key,
                situacao: { in: ['ATIVO', 'RECONHECIDO'] },
                ocorrido_em: { lte: now },
              },
              data: {
                situacao: 'RESOLVIDO',
                resolvido_em: now,
                usuario_resolucao_id: BigInt(userId),
              },
            });
      if (!result.count)
        throw new ConflictException('Alerta inexistente ou transição inválida');
      await tx.eventos_sistema.create({
        data: {
          usuario_id: BigInt(userId),
          categoria:
            action === 'reconhecer' ? 'ALERTA_RECONHECIDO' : 'ALERTA_RESOLVIDO',
          descricao: `Alerta ${key.toString()} ${action === 'reconhecer' ? 'reconhecido' : 'resolvido'}`,
        },
      });
      return tx.alertas.findUnique({ where: { id: key } });
    });
  }
}
