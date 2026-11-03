import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../src/app.module';
import { SerializeInterceptor } from '../src/common/serialize.interceptor';
import { JsonFilter } from '../src/common/json.filter';

describe('API com MySQL isolado', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;
  let deviceId: string;
  const run = randomUUID().slice(0, 8);

  beforeAll(async () => {
    if (!process.env.DATABASE_URL?.includes('teste'))
      throw new Error('DATABASE_URL de integração deve conter teste');
    prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.usuarios.upsert({
      where: { email: 'admin-teste@smarttraffic.local' },
      update: {
        senha_hash: await bcrypt.hash('SenhaTeste123!', 10),
        ativo: true,
      },
      create: {
        email: 'admin-teste@smarttraffic.local',
        nome: 'Admin Teste',
        nivel_acesso: 'ADMINISTRADOR',
        senha_hash: await bcrypt.hash('SenhaTeste123!', 10),
      },
    });
    await prisma.usuarios.upsert({
      where: { email: 'viewer-teste@smarttraffic.local' },
      update: {
        senha_hash: await bcrypt.hash('SenhaTeste123!', 10),
        ativo: true,
      },
      create: {
        email: 'viewer-teste@smarttraffic.local',
        nome: 'Viewer Teste',
        nivel_acesso: 'VISUALIZADOR',
        senha_hash: await bcrypt.hash('SenhaTeste123!', 10),
      },
    });
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new SerializeInterceptor());
    app.useGlobalFilters(new JsonFilter());
    await app.init();
  });
  afterAll(async () => {
    await app?.close();
    await prisma?.$disconnect();
  });

  it('protege rotas e autentica com senha válida', async () => {
    await request(app.getHttpServer()).get('/api/v1/vias').expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin-teste@smarttraffic.local', senha: 'errada' })
      .expect(401);
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin-teste@smarttraffic.local',
        senha: 'SenhaTeste123!',
      })
      .expect(201);
    token = response.body.accessToken;
    expect(token).toEqual(expect.any(String));
    expect(response.body.usuario).not.toHaveProperty('senhaHash');
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
  it('lista só as vias A e B e cadastra dispositivo', async () => {
    const vias = await request(app.getHttpServer())
      .get('/api/v1/vias')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(vias.body.map((v: { codigo: string }) => v.codigo)).toEqual([
      'A',
      'B',
    ]);
    const device = await request(app.getHttpServer())
      .post('/api/v1/dispositivos')
      .set('Authorization', `Bearer ${token}`)
      .send({ codigo: `CAM-${run}`, nome: 'Webcam de teste', tipo: 'CAMERA' })
      .expect(201);
    deviceId = device.body.id;
  });
  it('permite leitura ao visualizador e bloqueia escrita', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'viewer-teste@smarttraffic.local',
        senha: 'SenhaTeste123!',
      })
      .expect(201);
    const viewer = response.body.accessToken;
    await request(app.getHttpServer())
      .get('/api/v1/vias')
      .set('Authorization', `Bearer ${viewer}`)
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/dispositivos')
      .set('Authorization', `Bearer ${viewer}`)
      .send({ codigo: `NEG-${run}`, nome: 'Negado', tipo: 'CAMERA' })
      .expect(403);
  });
  it('cadastra e desativa usuário pela rota administrativa', async () => {
    const email = `conta-${run}@smarttraffic.local`;
    const created = await request(app.getHttpServer())
      .post('/api/v1/usuarios')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nome: 'Conta Teste',
        email,
        senha: 'SenhaCadastro123!',
        nivelAcesso: 'VISUALIZADOR',
      })
      .expect(201);
    expect(created.body).not.toHaveProperty('senhaHash');
    const disabled = await request(app.getHttpServer())
      .patch(`/api/v1/usuarios/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ativo: false })
      .expect(200);
    expect(disabled.body.ativo).toBe(false);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, senha: 'SenhaCadastro123!' })
      .expect(401);
  });
  it('valida UUID, dispositivo e deduplica evento concorrente', async () => {
    const key = process.env.INGESTION_KEY!;
    const base = {
      dispositivoId: deviceId,
      via: 'A',
      registradoEm: new Date().toISOString(),
      tipoLeitura: 'QUADRO',
      carrosDetectados: 2,
      pedestresDetectados: 1,
    };
    await request(app.getHttpServer())
      .post('/api/v1/leituras')
      .set('x-ingestion-key', key)
      .send({ ...base, identificadorEvento: 'ruim' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/v1/leituras')
      .set('x-ingestion-key', key)
      .send({
        ...base,
        identificadorEvento: randomUUID(),
        dispositivoId: '999999999',
      })
      .expect(400);
    const event = randomUUID();
    const responses = await Promise.all(
      [1, 2].map(() =>
        request(app.getHttpServer())
          .post('/api/v1/leituras')
          .set('x-ingestion-key', key)
          .send({ ...base, identificadorEvento: event }),
      ),
    );
    expect(responses.map((r) => r.status)).toEqual([201, 201]);
    expect(
      await prisma.leituras_trafego.count({
        where: { identificador_evento: event },
      }),
    ).toBe(1);
    await request(app.getHttpServer())
      .post('/api/v1/leituras')
      .set('x-ingestion-key', key)
      .send({ ...base, carrosDetectados: 9, identificadorEvento: event })
      .expect(409);
    const list = await request(app.getHttpServer())
      .get('/api/v1/leituras?via=A&pagina=1&limite=1')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(list.body.limite).toBe(1);
    expect(list.body.total).toBeGreaterThanOrEqual(1);
  });
  it('registra fase, transições do alerta e resumo real', async () => {
    const semaforos = await request(app.getHttpServer())
      .get('/api/v1/semaforos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const phase = await request(app.getHttpServer())
      .post('/api/v1/historico-fases')
      .set('x-ingestion-key', process.env.INGESTION_KEY!)
      .send({
        semaforoId: semaforos.body[0].id,
        cor: 'VERMELHO',
        inicioEm: new Date().toISOString(),
        origemEstado: 'SIMULACAO',
      })
      .expect(201);
    expect(phase.body.cor).toBe('VERMELHO');
    await request(app.getHttpServer())
      .post('/api/v1/historico-fases')
      .set('x-ingestion-key', process.env.INGESTION_KEY!)
      .send({
        semaforoId: semaforos.body[0].id,
        cor: 'VERDE',
        inicioEm: phase.body.inicioEm,
        origemEstado: 'SIMULACAO',
      })
      .expect(409);
    await request(app.getHttpServer())
      .post('/api/v1/telemetria')
      .set('x-ingestion-key', process.env.INGESTION_KEY!)
      .send({
        dispositivoId: deviceId,
        registradoEm: new Date().toISOString(),
        status: 'ONLINE',
        cpuPercentual: 101,
      })
      .expect(400);
    const telemetry = await request(app.getHttpServer())
      .post('/api/v1/telemetria')
      .set('x-ingestion-key', process.env.INGESTION_KEY!)
      .send({
        dispositivoId: deviceId,
        registradoEm: new Date().toISOString(),
        status: 'ONLINE',
        cpuPercentual: 42,
      })
      .expect(201);
    expect(telemetry.body.status).toBe('ONLINE');
    const alert = await request(app.getHttpServer())
      .post('/api/v1/alertas')
      .set('Authorization', `Bearer ${token}`)
      .send({
        tipo: 'TESTE',
        titulo: 'Alerta teste',
        gravidade: 'AVISO',
        descricao: 'Descrição de teste',
      })
      .expect(201);
    const ack = await request(app.getHttpServer())
      .patch(`/api/v1/alertas/${alert.body.id}/reconhecer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(ack.body.situacao).toBe('RECONHECIDO');
    const done = await request(app.getHttpServer())
      .patch(`/api/v1/alertas/${alert.body.id}/resolver`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(done.body.situacao).toBe('RESOLVIDO');
    await request(app.getHttpServer())
      .patch(`/api/v1/alertas/${alert.body.id}/reconhecer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    const summary = await request(app.getHttpServer())
      .get('/api/v1/dashboard/resumo')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(summary.body.leiturasRegistradas).toBeGreaterThanOrEqual(1);
    expect(summary.body.dispositivosOnline).toBeGreaterThanOrEqual(1);
  });
});
