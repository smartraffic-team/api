import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Ingest } from '../../common/auth';
import { PeriodDto, PhaseDto } from '../../common/dto';
import { page, period } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';
import { HistoricoService } from './historico.service';

@ApiTags('historico-fases')
@Controller('historico-fases')
export class HistoricoController {
  constructor(
    private prisma: PrismaService,
    private service: HistoricoService,
  ) {}
  @ApiBearerAuth() @Get() async list(@Query() query: PeriodDto) {
    const p = page(query);
    const where: Prisma.historico_fasesWhereInput = {
      inicio_em: period(query),
    };
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.historico_fases.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { inicio_em: query.ordem ?? 'desc' },
          { id: query.ordem ?? 'desc' },
        ],
      }),
      this.prisma.historico_fases.count({ where }),
    ]);
    return { dados, total, pagina: p.pagina, limite: p.limite };
  }
  @Ingest()
  @ApiHeader({ name: 'x-ingestion-key' })
  @Post()
  create(@Body() dto: PhaseDto) {
    return this.service.create(dto);
  }
}
