import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { publicUser, required } from '../../common/helpers';
import { LoginDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}
  async login(dto: LoginDto) {
    const user = await this.prisma.usuarios.findUnique({
      where: { email: dto.email.toLowerCase() },
    });
    if (!user?.ativo || !(await bcrypt.compare(dto.senha, user.senha_hash)))
      throw new UnauthorizedException('Credenciais inválidas');
    await this.prisma.usuarios.update({
      where: { id: user.id },
      data: { ultimo_acesso_em: new Date() },
    });
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id.toString() }),
      tokenType: 'Bearer',
      expiresIn: 3600,
      usuario: publicUser(user),
    };
  }
  async me(id: string) {
    return publicUser(
      required(
        await this.prisma.usuarios.findUnique({ where: { id: BigInt(id) } }),
      ),
    );
  }
}
