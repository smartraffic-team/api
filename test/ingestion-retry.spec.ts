import { ConflictException } from '@nestjs/common';
import { HistoricoService } from '../src/modules/historico-fases/historico.service';
import { TelemetriaController } from '../src/modules/telemetria/telemetria.controller';
import { PrismaService } from '../src/prisma/prisma.service';

describe('reenvios de ingestão', () => {
  const timestamp = new Date('2026-11-10T12:00:00.000Z');
  it('reconhece fase já fechada sem reabrir ou alterar o sinal atual', async () => {
    const existing = {
      id: 5n,
      cor: 'VERDE',
      origem_estado: 'ARDUINO',
      modo_operacao: 'ADAPTATIVO',
      inicio_em: timestamp,
      fim_em: new Date(timestamp.getTime() + 8000),
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1n }]),
      historico_fases: {
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
      semaforos: { update: jest.fn() },
    };
    const prisma = {
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    };
    const service = new HistoricoService(prisma as unknown as PrismaService);
    const dto = {
      semaforoId: '1',
      cor: 'VERDE',
      origemEstado: 'ARDUINO',
      modoOperacao: 'ADAPTATIVO',
      inicioEm: timestamp.toISOString(),
    };
    expect(await service.create(dto)).toBe(existing);
    expect(tx.semaforos.update).not.toHaveBeenCalled();
    expect(tx.historico_fases.create).not.toHaveBeenCalled();
    await expect(
      service.create({ ...dto, cor: 'AMARELO' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('reconhece telemetria igual e rejeita mudança no mesmo dispositivo/instante', async () => {
    const existing = {
      id: 8n,
      status: 'ONLINE',
      cpu_percentual: null,
      memoria_percentual: null,
      temperatura_c: null,
      fps: null,
      latencia_ms: null,
    };
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([{ id: 1n }]),
      telemetria_dispositivos: {
        findFirst: jest.fn().mockResolvedValue(existing),
        create: jest.fn(),
      },
      dispositivos: { updateMany: jest.fn() },
    };
    const prisma = {
      dispositivos: {
        findUnique: jest.fn().mockResolvedValue({ id: 1n, ativo: true }),
      },
      $transaction: (fn: (client: typeof tx) => unknown) => fn(tx),
    };
    const controller = new TelemetriaController(
      prisma as unknown as PrismaService,
    );
    const dto = {
      dispositivoId: '1',
      registradoEm: timestamp.toISOString(),
      status: 'ONLINE',
    };
    expect(await controller.create(dto)).toBe(existing);
    expect(tx.dispositivos.updateMany).not.toHaveBeenCalled();
    expect(tx.telemetria_dispositivos.create).not.toHaveBeenCalled();
    await expect(
      controller.create({ ...dto, status: 'OFFLINE' }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
