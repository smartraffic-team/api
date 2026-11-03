import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PeriodDto } from '../../common/dto';
import { period } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private prisma: PrismaService) {}
  @Get('resumo') async resumo(@Query() query: PeriodDto) {
    const range = period(query);
    const [online, offline, alertasAtivos, leituras, semaforos, dispositivos] =
      await Promise.all([
        this.prisma.dispositivos.count({
          where: { status: 'ONLINE', ativo: true },
        }),
        this.prisma.dispositivos.count({
          where: { status: 'OFFLINE', ativo: true },
        }),
        this.prisma.alertas.count({
          where: { situacao: { in: ['ATIVO', 'RECONHECIDO'] } },
        }),
        this.prisma.leituras_trafego.count({ where: { registrado_em: range } }),
        this.prisma.semaforos.findMany({
          select: {
            id: true,
            cor_atual: true,
            modo_operacao: true,
            atualizado_em: true,
            vias: { select: { codigo: true } },
          },
        }),
        this.prisma.dispositivos.findMany({
          select: { id: true, ultimo_contato_em: true, status: true },
        }),
      ]);
    return {
      dispositivosOnline: online,
      dispositivosOffline: offline,
      alertasAtivos,
      leiturasRegistradas: leituras,
      semaforos,
      ultimosContatos: dispositivos,
    };
  }
}
