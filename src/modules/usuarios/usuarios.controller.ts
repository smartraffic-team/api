import { Body, Controller, Get, Param, Patch, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import * as bcrypt from 'bcrypt';
import { Roles } from '../../common/auth';
import { UserDto, UserPatchDto } from '../../common/dto';
import { bigintId, publicUser, required } from '../../common/helpers';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('usuarios')
@ApiBearerAuth()
@Roles('ADMINISTRADOR')
@Controller('usuarios')
export class UsuariosController {
  constructor(private prisma: PrismaService) {}
  @Get() async list() {
    return (
      await this.prisma.usuarios.findMany({ orderBy: { id: 'asc' } })
    ).map(publicUser);
  }
  @Get(':id') async get(@Param('id') id: string) {
    return publicUser(
      required(
        await this.prisma.usuarios.findUnique({ where: { id: bigintId(id) } }),
      ),
    );
  }
  @Post() async create(
    @Body() dto: UserDto,
    @Req() req: { user: { id: string } },
  ) {
    const hash = await bcrypt.hash(dto.senha, 12);
    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.usuarios.create({
        data: {
          nome: dto.nome.trim(),
          email: dto.email.toLowerCase().trim(),
          senha_hash: hash,
          nivel_acesso: dto.nivelAcesso,
          telefone: dto.telefone,
          cargo: dto.cargo,
        },
      });
      await tx.eventos_sistema.create({
        data: {
          usuario_id: BigInt(req.user.id),
          categoria: 'USUARIO_CRIADO',
          descricao: 'Conta de usuário criada',
        },
      });
      return created;
    });
    return publicUser(user);
  }
  @Patch(':id') async update(
    @Param('id') id: string,
    @Body() dto: UserPatchDto,
    @Req() req: { user: { id: string } },
  ) {
    const hash = dto.senha ? await bcrypt.hash(dto.senha, 12) : undefined;
    const user = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.usuarios.update({
        where: { id: bigintId(id) },
        data: {
          nome: dto.nome?.trim(),
          email: dto.email?.toLowerCase().trim(),
          senha_hash: hash,
          nivel_acesso: dto.nivelAcesso,
          telefone: dto.telefone,
          cargo: dto.cargo,
          ativo: dto.ativo,
        },
      });
      await tx.eventos_sistema.create({
        data: {
          usuario_id: BigInt(req.user.id),
          categoria: 'USUARIO_ATUALIZADO',
          descricao: 'Conta de usuário atualizada',
        },
      });
      return updated;
    });
    return publicUser(user);
  }
}
