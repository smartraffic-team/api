import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { PhaseDto } from '../../common/dto';
import { bigintId, date } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class HistoricoService {
  constructor(private prisma: PrismaService) {}
  async create(dto: PhaseDto) {
    const id = bigintId(dto.semaforoId);
    const inicio = new Date(dto.inicioEm);
    const fim = date(dto.fimEm);
    if (fim && fim <= inicio)
      throw new BadRequestException('Fim deve ser posterior ao início');
    return this.prisma.$transaction(async (tx) => {
      // O bloqueio serializa gravações concorrentes do mesmo semáforo.
      const locked = await tx.$queryRaw<
        Array<{ id: bigint }>
      >`SELECT id FROM semaforos WHERE id = ${id} FOR UPDATE`;
      if (!locked.length) throw new BadRequestException('Semáforo inexistente');
      const existing = await tx.historico_fases.findFirst({
        where: { semaforo_id: id, inicio_em: inicio },
      });
      if (existing) {
        // Uma fase aberta pode ter sido fechada pelo próximo evento após o envio.
        if (
          existing.cor === dto.cor &&
          existing.origem_estado === dto.origemEstado &&
          existing.modo_operacao === (dto.modoOperacao ?? null) &&
          (!fim || existing.fim_em?.getTime() === fim.getTime())
        )
          return existing;
        throw new ConflictException(
          'Fase já registrada com conteúdo diferente',
        );
      }
      const last = await tx.historico_fases.findFirst({
        where: { semaforo_id: id },
        orderBy: [{ inicio_em: 'desc' }, { id: 'desc' }],
      });
      if (last) {
        if (inicio <= last.inicio_em || (last.fim_em && inicio < last.fim_em))
          throw new ConflictException('Fase sobreposta ou fora de ordem');
        if (!last.fim_em)
          await tx.historico_fases.update({
            where: { id: last.id },
            data: { fim_em: inicio },
          });
      }
      const phase = await tx.historico_fases.create({
        data: {
          semaforo_id: id,
          cor: dto.cor,
          inicio_em: inicio,
          fim_em: fim,
          origem_estado: dto.origemEstado,
          modo_operacao: dto.modoOperacao,
        },
      });
      await tx.semaforos.update({
        where: { id },
        data: { cor_atual: dto.cor, modo_operacao: dto.modoOperacao },
      });
      return phase;
    });
  }
}
