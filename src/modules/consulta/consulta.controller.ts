import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { bigintId, required } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('consulta')
@ApiBearerAuth()
@Controller()
export class ConsultaController {
  constructor(private prisma: PrismaService) {}
  @Get('cruzamento') async cruzamento() {
    return required(
      await this.prisma.cruzamentos.findUnique({ where: { id: 1 } }),
    );
  }
  @Get('vias') vias() {
    return this.prisma.vias.findMany({ orderBy: { codigo: 'asc' } });
  }
  @Get('vias/:codigo') async via(@Param('codigo') codigo: string) {
    if (codigo !== 'A' && codigo !== 'B') throw new NotFoundException();
    return required(await this.prisma.vias.findUnique({ where: { codigo } }));
  }
  @Get('semaforos') semaforos() {
    return this.prisma.semaforos.findMany({
      include: { vias: true },
      orderBy: { id: 'asc' },
    });
  }
  @Get('semaforos/:id') async semaforo(@Param('id') id: string) {
    return required(
      await this.prisma.semaforos.findUnique({
        where: { id: bigintId(id) },
        include: { vias: true },
      }),
    );
  }
}
