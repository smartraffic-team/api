export function validateEnv(env: Record<string, unknown>) {
  for (const name of ['DATABASE_URL', 'JWT_SECRET', 'INGESTION_KEY']) {
    if (typeof env[name] !== 'string' || !env[name])
      throw new Error(`${name} obrigatório`);
  }
  if (
    String(env.JWT_SECRET).length < 32 ||
    String(env.INGESTION_KEY).length < 32
  )
    throw new Error(
      'JWT_SECRET e INGESTION_KEY devem ter ao menos 32 caracteres',
    );
  if (!String(env.DATABASE_URL).startsWith('mysql://'))
    throw new Error('DATABASE_URL deve usar MySQL');
  return env;
}
