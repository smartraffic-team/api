import { BadRequestException, NotFoundException } from '@nestjs/common';

export function bigintId(value: string): bigint {
  if (!/^[1-9][0-9]*$/.test(value))
    throw new BadRequestException('ID inválido');
  return BigInt(value);
}
export function required<T>(value: T | null | undefined): T {
  if (value == null) throw new NotFoundException('Registro não encontrado');
  return value;
}
export function page(query: { pagina?: number; limite?: number }) {
  const pagina = query.pagina ?? 1;
  const limite = query.limite ?? 20;
  if (
    !Number.isInteger(pagina) ||
    pagina < 1 ||
    !Number.isInteger(limite) ||
    limite < 1 ||
    limite > 100
  )
    throw new BadRequestException('Paginação inválida');
  return { skip: (pagina - 1) * limite, take: limite, pagina, limite };
}
export function date(value?: string) {
  return value ? new Date(value) : undefined;
}
export function period(query: { inicio?: string; fim?: string }) {
  if (
    query.inicio &&
    query.fim &&
    Date.parse(query.inicio) > Date.parse(query.fim)
  )
    throw new BadRequestException('Período inválido');
  return query.inicio || query.fim
    ? { gte: date(query.inicio), lte: date(query.fim) }
    : undefined;
}
export const publicUser = (u: {
  id: bigint;
  nome: string;
  email: string;
  telefone: string | null;
  cargo: string | null;
  nivel_acesso: string;
  ativo: boolean;
  criado_em: Date;
  atualizado_em: Date;
}) => ({
  id: u.id.toString(),
  nome: u.nome,
  email: u.email,
  telefone: u.telefone,
  cargo: u.cargo,
  nivelAcesso: u.nivel_acesso,
  ativo: u.ativo,
  criadoEm: u.criado_em,
  atualizadoEm: u.atualizado_em,
});
