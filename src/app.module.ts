import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env';
import { IngestGuard, JwtGuard, RolesGuard } from './common/auth';
import { PrismaService } from './prisma/prisma.service';
import { JwtStrategy } from './modules/auth/jwt.strategy';
import { AuthController } from './modules/auth/auth.controller';
import { AuthService } from './modules/auth/auth.service';
import { UsuariosController } from './modules/usuarios/usuarios.controller';
import { ConsultaController } from './modules/consulta/consulta.controller';
import { DispositivosController } from './modules/dispositivos/dispositivos.controller';
import { LeiturasController } from './modules/leituras-trafego/leituras.controller';
import { LeiturasService } from './modules/leituras-trafego/leituras.service';
import { HistoricoController } from './modules/historico-fases/historico.controller';
import { HistoricoService } from './modules/historico-fases/historico.service';
import { AlertasController } from './modules/alertas/alertas.controller';
import { AlertasService } from './modules/alertas/alertas.service';
import { TelemetriaController } from './modules/telemetria/telemetria.controller';
import { EventosController } from './modules/eventos/eventos.controller';
import { DashboardController } from './modules/dashboard/dashboard.controller';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET!,
        signOptions: { expiresIn: '1h' },
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }]),
  ],
  controllers: [
    AuthController,
    UsuariosController,
    ConsultaController,
    DispositivosController,
    LeiturasController,
    HistoricoController,
    AlertasController,
    TelemetriaController,
    EventosController,
    DashboardController,
    HealthController,
  ],
  providers: [
    PrismaService,
    JwtStrategy,
    AuthService,
    LeiturasService,
    HistoricoService,
    AlertasService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: IngestGuard },
  ],
})
export class AppModule {}
