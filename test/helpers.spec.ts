import { BadRequestException } from '@nestjs/common';
import { bigintId, page } from '../src/common/helpers';
import { jsonSafe } from '../src/common/json-safe';

describe('contratos comuns', () => {
  it('serializa BIGINT, datas e nomes do banco sem perda', () => {
    expect(
      jsonSafe({
        dispositivo_id: 9007199254740993n,
        registrado_em: new Date('2026-01-01T00:00:00Z'),
      }),
    ).toEqual({
      dispositivoId: '9007199254740993',
      registradoEm: '2026-01-01T00:00:00.000Z',
    });
  });
  it('rejeita IDs e paginação inválidos', () => {
    expect(() => bigintId('0')).toThrow(BadRequestException);
    expect(() => bigintId('1 OR 1=1')).toThrow(BadRequestException);
    expect(() => page({ pagina: 0 })).toThrow(BadRequestException);
    expect(() => page({ limite: 101 })).toThrow(BadRequestException);
  });
});
