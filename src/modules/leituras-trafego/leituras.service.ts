import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ReadingDto, ReadingsQuery } from '../../common/dto';
import { bigintId, date, page, period } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeiturasService {
  constructor(private prisma: PrismaService) {}
  async list(query: ReadingsQuery) {
    const range = period(query);
    const p = page(query);
    const via = query.via
      ? await this.prisma.vias.findUnique({ where: { codigo: query.via } })
      : undefined;
    if (query.via && !via)
      return { dados: [], pagina: p.pagina, limite: p.limite, total: 0 };
    const where: Prisma.leituras_trafegoWhereInput = {
      via_id: via?.id,
      tipo_leitura: query.tipoLeitura,
      dispositivo_id: query.dispositivoId
        ? bigintId(query.dispositivoId)
        : undefined,
      registrado_em: range,
    };
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.leituras_trafego.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { registrado_em: query.ordem ?? 'desc' },
          { id: query.ordem ?? 'desc' },
        ],
      }),
      this.prisma.leituras_trafego.count({ where }),
    ]);
    return { dados, total, pagina: p.pagina, limite: p.limite };
  }
  async create(dto: ReadingDto) {
    const dispositivoId = bigintId(dto.dispositivoId);
    const device = await this.prisma.dispositivos.findUnique({
      where: { id: dispositivoId },
    });
    if (
      !device ||
      !device.ativo ||
      !['CAMERA', 'COMPUTADOR'].includes(device.tipo)
    )
      throw new BadRequestException(
        'Dispositivo inexistente ou não autorizado',
      );
    const via = await this.prisma.vias.findUnique({
      where: { codigo: dto.via },
    });
    if (!via?.ativa || (device.via_id && device.via_id !== via.id))
      throw new BadRequestException('Via incompatível com dispositivo');
    if (
      dto.tipoLeitura === 'QUADRO' &&
      (dto.periodoInicioEm || dto.veiculosUnicos != null)
    )
      throw new BadRequestException(
        'QUADRO não aceita período nem veículos únicos',
      );
    if (
      dto.tipoLeitura === 'AGREGADA' &&
      (!dto.periodoInicioEm ||
        Date.parse(dto.periodoInicioEm) >= Date.parse(dto.registradoEm))
    )
      throw new BadRequestException('Período inválido');
    if (Date.parse(dto.registradoEm) > Date.now() + 60_000)
      throw new BadRequestException('Data futura');
    const evento = dto.identificadorEvento.toLowerCase();
    const data = {
      dispositivo_id: dispositivoId,
      via_id: via.id,
      identificador_evento: evento,
      registrado_em: new Date(dto.registradoEm),
      tipo_leitura: dto.tipoLeitura,
      origem_leitura: dto.origemLeitura ?? 'VISAO_COMPUTACIONAL',
      periodo_inicio_em: date(dto.periodoInicioEm),
      carros_detectados: dto.carrosDetectados,
      pedestres_detectados: dto.pedestresDetectados,
      veiculos_em_espera: dto.veiculosEmEspera,
      veiculos_unicos: dto.veiculosUnicos,
    };
    try {
      return await this.prisma.leituras_trafego.create({ data });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.leituras_trafego.findUnique({
          where: {
            dispositivo_id_identificador_evento: {
              dispositivo_id: dispositivoId,
              identificador_evento: evento,
            },
          },
        });
        if (
          existing &&
          existing.via_id === via.id &&
          existing.registrado_em.getTime() === data.registrado_em.getTime() &&
          existing.tipo_leitura === data.tipo_leitura &&
          existing.origem_leitura === data.origem_leitura &&
          (existing.periodo_inicio_em?.getTime() ?? null) ===
            (data.periodo_inicio_em?.getTime() ?? null) &&
          existing.carros_detectados === data.carros_detectados &&
          existing.pedestres_detectados === data.pedestres_detectados &&
          existing.veiculos_em_espera === (data.veiculos_em_espera ?? null) &&
          existing.veiculos_unicos === (data.veiculos_unicos ?? null)
        )
          return existing;
        throw new ConflictException(
          'Evento já registrado com conteúdo diferente',
        );
      }
      throw error;
    }
  }
}
