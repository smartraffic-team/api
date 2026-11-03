import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { Roles } from '../../common/auth';
import { AlertDto, AlertPatchDto, PeriodDto } from '../../common/dto';
import { bigintId, date, page, period, required } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';
import { AlertasService } from './alertas.service';

@ApiTags('alertas')
@ApiBearerAuth()
@Controller('alertas')
export class AlertasController {
  constructor(
    private prisma: PrismaService,
    private service: AlertasService,
  ) {}
  @Get() async list(@Query() query: PeriodDto) {
    const p = page(query);
    const where: Prisma.alertasWhereInput = { ocorrido_em: period(query) };
    const [dados, total] = await this.prisma.$transaction([
      this.prisma.alertas.findMany({
        where,
        skip: p.skip,
        take: p.take,
        orderBy: [
          { ocorrido_em: query.ordem ?? 'desc' },
          { id: query.ordem ?? 'desc' },
        ],
      }),
      this.prisma.alertas.count({ where }),
    ]);
    return { dados, total, pagina: p.pagina, limite: p.limite };
  }
  @Get(':id') async get(@Param('id') id: string) {
    return required(
      await this.prisma.alertas.findUnique({ where: { id: bigintId(id) } }),
    );
  }
  @Roles('ADMINISTRADOR', 'OPERADOR') @Post() async create(
    @Body() dto: AlertDto,
  ) {
    return this.prisma.alertas.create({
      data: {
        dispositivo_id: dto.dispositivoId
          ? bigintId(dto.dispositivoId)
          : undefined,
        tipo: dto.tipo.trim(),
        titulo: dto.titulo.trim(),
        gravidade: dto.gravidade,
        descricao: dto.descricao.trim(),
        ocorrido_em: date(dto.ocorridoEm),
      },
    });
  }
  @Roles('ADMINISTRADOR', 'OPERADOR') @Patch(':id') async patch(
    @Param('id') id: string,
    @Body() dto: AlertPatchDto,
  ) {
    return this.prisma.alertas.update({
      where: { id: bigintId(id) },
      data: {
        titulo: dto.titulo?.trim(),
        descricao: dto.descricao?.trim(),
        gravidade: dto.gravidade,
      },
    });
  }
  @Roles('ADMINISTRADOR', 'OPERADOR')
  @Patch(':id/reconhecer')
  async acknowledge(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.transition(id, req.user.id, 'reconhecer');
  }
  @Roles('ADMINISTRADOR', 'OPERADOR') @Patch(':id/resolver') async resolve(
    @Param('id') id: string,
    @Req() req: { user: { id: string } },
  ) {
    return this.service.transition(id, req.user.id, 'resolver');
  }
}
