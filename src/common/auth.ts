import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { timingSafeEqual } from 'node:crypto';

export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
export const Ingest = () => SetMetadata('ingest', true);

@Injectable()
export class JwtGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }
  canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>('public', [
        context.getHandler(),
        context.getClass(),
      ]) ||
      this.reflector.getAllAndOverride<boolean>('ingest', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    return super.canActivate(context);
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = context.switchToHttp().getRequest().user;
    if (!user || !roles.includes(user.nivelAcesso))
      throw new ForbiddenException();
    return true;
  }
}

@Injectable()
export class IngestGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    if (
      !this.reflector.getAllAndOverride<boolean>('ingest', [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const header = context.switchToHttp().getRequest().headers[
      'x-ingestion-key'
    ];
    const expected = Buffer.from(process.env.INGESTION_KEY || '');
    const received = Buffer.from(typeof header === 'string' ? header : '');
    if (
      received.length !== expected.length ||
      !timingSafeEqual(received, expected)
    )
      throw new UnauthorizedException();
    return true;
  }
}
