import {
  BadRequestException,
  Body,
  Controller,
  ConflictException,
  Get,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Ingest } from '../../common/auth';
import { PeriodDto, TelemetryDto } from '../../common/dto';
import { bigintId, page, period } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('telemetria')
@Controller('telemetria')
export class TelemetriaController {
  constructor(private prisma: PrismaService) {}
  @ApiBearerAuth() @Get() async list(@Query() query: PeriodDto) {
    const p = page(query);
    const where: Prisma.telemetria_dispositivosWhereInput = {
      registrado_em: period(query),
    };
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.telemetria_dispositivos.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { registrado_em: query.ordem ?? 'desc' },
          { id: query.ordem ?? 'desc' },
        ],
      }),
      this.prisma.telemetria_dispositivos.count({ where }),
    ]);
    return { dados, total, pagina: p.pagina, limite: p.limite };
  }
  @Ingest() @ApiHeader({ name: 'x-ingestion-key' }) @Post() async create(
    @Body() dto: TelemetryDto,
  ) {
    const device = await this.prisma.dispositivos.findUnique({
      where: { id: bigintId(dto.dispositivoId) },
    });
    if (!device?.ativo)
      throw new BadRequestException('Dispositivo inexistente ou inativo');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM dispositivos WHERE id = ${device.id} FOR UPDATE`;
      const existing = await tx.telemetria_dispositivos.findFirst({
        where: {
          dispositivo_id: device.id,
          registrado_em: new Date(dto.registradoEm),
        },
      });
      if (existing) {
        if (
          existing.status === dto.status &&
          (existing.cpu_percentual == null
            ? null
            : Number(existing.cpu_percentual)) ===
            (dto.cpuPercentual ?? null) &&
          (existing.memoria_percentual == null
            ? null
            : Number(existing.memoria_percentual)) ===
            (dto.memoriaPercentual ?? null) &&
          (existing.temperatura_c == null
            ? null
            : Number(existing.temperatura_c)) === (dto.temperaturaC ?? null) &&
          (existing.fps == null ? null : Number(existing.fps)) ===
            (dto.fps ?? null) &&
          existing.latencia_ms === (dto.latenciaMs ?? null)
        )
          return existing;
        throw new ConflictException(
          'Telemetria já registrada com conteúdo diferente',
        );
      }
      const recorded = await tx.telemetria_dispositivos.create({
        data: {
          dispositivo_id: device.id,
          registrado_em: new Date(dto.registradoEm),
          status: dto.status,
          cpu_percentual: dto.cpuPercentual,
          memoria_percentual: dto.memoriaPercentual,
          temperatura_c: dto.temperaturaC,
          fps: dto.fps,
          latencia_ms: dto.latenciaMs,
        },
      });
      await tx.dispositivos.updateMany({
        where: {
          id: device.id,
          OR: [
            { ultimo_contato_em: null },
            { ultimo_contato_em: { lt: new Date(dto.registradoEm) } },
          ],
        },
        data: {
          status: dto.status,
          ultimo_contato_em: new Date(dto.registradoEm),
        },
      });
      return recorded;
    });
  }
}
