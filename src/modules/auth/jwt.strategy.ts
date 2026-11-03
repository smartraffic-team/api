import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET!,
    });
  }
  async validate(payload: { sub: string }) {
    const user = await this.prisma.usuarios.findUnique({
      where: { id: BigInt(payload.sub) },
    });
    if (!user?.ativo) throw new UnauthorizedException();
    return { id: user.id.toString(), nivelAcesso: user.nivel_acesso };
  }
}
