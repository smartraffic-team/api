import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Roles } from '../../common/auth';
import { EventDto, PeriodDto } from '../../common/dto';
import { bigintId, date, page, period } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('eventos')
@ApiBearerAuth()
@Controller('eventos')
export class EventosController {
  constructor(private prisma: PrismaService) {}
  @Get() async list(@Query() query: PeriodDto) {
    const p = page(query);
    const where: Prisma.eventos_sistemaWhereInput = {
      ocorrido_em: period(query),
    };
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.eventos_sistema.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { ocorrido_em: query.ordem ?? 'desc' },
          { id: query.ordem ?? 'desc' },
        ],
      }),
      this.prisma.eventos_sistema.count({ where }),
    ]);
    return { dados, total, pagina: p.pagina, limite: p.limite };
  }
  @Roles('ADMINISTRADOR', 'OPERADOR') @Post() create(
    @Body() dto: EventDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.prisma.eventos_sistema.create({
      data: {
        dispositivo_id: dto.dispositivoId
          ? bigintId(dto.dispositivoId)
          : undefined,
        usuario_id: BigInt(req.user.id),
        categoria: dto.categoria.trim(),
        gravidade: dto.gravidade,
        descricao: dto.descricao.trim(),
        ocorrido_em: date(dto.ocorridoEm),
      },
    });
  }
}
