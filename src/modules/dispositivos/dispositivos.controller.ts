import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/auth';
import { DeviceDto, DevicePatchDto } from '../../common/dto';
import { bigintId, required } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('dispositivos')
@ApiBearerAuth()
@Controller('dispositivos')
export class DispositivosController {
  constructor(private prisma: PrismaService) {}
  @Get() list() {
    return this.prisma.dispositivos.findMany({ orderBy: { id: 'asc' } });
  }
  @Get(':id') async get(@Param('id') id: string) {
    return required(
      await this.prisma.dispositivos.findUnique({
        where: { id: bigintId(id) },
      }),
    );
  }
  private async via(value?: string) {
    if (!value) return undefined;
    const via = await this.prisma.vias.findUnique({
      where: { id: bigintId(value) },
    });
    if (!via) throw new BadRequestException('Via inexistente');
    return via.id;
  }
  @Roles('ADMINISTRADOR', 'OPERADOR') @Post() async create(
    @Body() dto: DeviceDto,
  ) {
    return this.prisma.dispositivos.create({
      data: {
        codigo: dto.codigo.trim(),
        nome: dto.nome.trim(),
        tipo: dto.tipo,
        cruzamento_id: 1,
        via_id: await this.via(dto.viaId),
        modelo: dto.modelo,
        versao_software: dto.versaoSoftware,
        endereco_ip: dto.enderecoIp,
      },
    });
  }
  @Roles('ADMINISTRADOR', 'OPERADOR') @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: DevicePatchDto,
  ) {
    return this.prisma.dispositivos.update({
      where: { id: bigintId(id) },
      data: {
        nome: dto.nome?.trim(),
        tipo: dto.tipo,
        via_id: await this.via(dto.viaId),
        modelo: dto.modelo,
        versao_software: dto.versaoSoftware,
        endereco_ip: dto.enderecoIp,
        status: dto.status,
        ativo: dto.ativo,
      },
    });
  }
}
