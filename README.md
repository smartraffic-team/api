# SmartTraffic API

API REST NestJS para registrar telemetria e consultar o cruzamento da maquete. O [repositório database](https://github.com/smartraffic-team/database) mantém o SQL oficial V2.1. Esta API **não** cria o schema e **não** aciona LEDs nem escolhe a fase semafórica.

## Estado implementado

- Autenticação JWT para usuários ativos, hash bcrypt, níveis `ADMINISTRADOR`, `OPERADOR` e `VISUALIZADOR`.
- Chave separada `x-ingestion-key` para leituras, fases e telemetria; rate limiting em autenticação e ingestão.
- CRUD limitado de usuários, dispositivos e alertas; consultas de cruzamento, vias, semáforos, leituras, histórico, eventos e dashboard.
- Prisma introspectado das dez tabelas V2.1; IDs `BIGINT` em strings e datas em ISO 8601 nas respostas.
- Validação de DTOs, erros HTTP padronizados, CORS configurável, Swagger e healthcheck.
- Testes unitários e integração com MySQL isolado; Dockerfile e CI.

## Requisitos e instalação

Node.js 24 LTS, npm, Docker Desktop e o MySQL já inicializado pelo repositório `database/`. O banco local usa `smarttraffic`; o novo banco da Aiven usa `smarttraffic_v21`. Nunca rode `prisma db push` ou `prisma migrate dev` contra eles: as constraints `CHECK` e a coluna gerada são mantidas no SQL oficial.

```powershell
cd database
docker compose up -d --wait
cd ../api
npm ci
Copy-Item .env.example .env
notepad .env
npm run prisma:generate
npm run dev
```

Defina `DATABASE_URL`, `JWT_SECRET` e `INGESTION_KEY` no `.env`. Use senhas diferentes e aleatórias para JWT e ingestão, com pelo menos 32 caracteres. A URL local usa o usuário criado pelo Compose do database. Para rodar a API em container, crie uma configuração própria com `host.docker.internal`:

Se aparecer `PrismaClientInitializationError` com código **P1000**, confira usuário, senha, porta e nome do banco na `DATABASE_URL` de `api/.env`. Eles devem corresponder a `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_HOST_PORTA` e `MYSQL_DATABASE` de `database/.env`. Teste sem mostrar a senha com `npm run db:check`. Alterar `database/.env` depois que o volume MySQL foi criado não troca automaticamente a senha já gravada no servidor; nesse caso, restaure a senha original ou altere a senha do usuário no MySQL de forma explícita.

```powershell
Copy-Item .env .env.docker
(Get-Content .env.docker) -replace '@127.0.0.1:', '@host.docker.internal:' | Set-Content .env.docker
$env:API_ENV_FILE='.env.docker'
docker compose --env-file .env.docker up --build -d
```

O Docker Compose da API **não** inicializa outro MySQL. Ele pressupõe o banco do repositório `database/` e monta `../database/certs` em `/app/certs` para o CA da Aiven.

Para a Aiven, configure um usuário próprio da API com DML em `smarttraffic_v21.*` e TLS. Troque somente `DATABASE_URL` por uma URL que termine em `/smarttraffic_v21?sslaccept=strict&sslcert=/app/certs/ca.pem` no container. No host, o caminho do CA relativo a `prisma/schema.prisma` é `../../database/certs/ca.pem`. Para usar um `.env.aiven` ignorado pelo Git no Docker, defina `$env:API_ENV_FILE='.env.aiven'` e execute `docker compose --env-file .env.aiven up -d`. Nunca use `avnadmin` na aplicação. O database legado `smarttraffic` de oito tabelas não é compatível com esta API.

## Primeiro administrador

Não há cadastro público. Execute localmente, com a URL apontando para o banco desejado:

```powershell
$env:ADMIN_EMAIL='admin@exemplo.com'
$env:ADMIN_NAME='Administrador'
$env:ADMIN_PASSWORD='uma-senha-forte-com-12-ou-mais-caracteres'
npm run build
npm run admin:create
Remove-Item Env:ADMIN_PASSWORD
```

O comando recusa criar outra conta se já existir um administrador. Usuários posteriores são criados por um administrador autenticado em `POST /usuarios`.

## Contratos HTTP

Prefixo `/api/v1`; Swagger em `http://localhost:3000/api/docs`. Leituras exigem `Authorization: Bearer <token>`, exceto `/health` e `/auth/login`. As rotas de escrita de leituras, fases e telemetria usam apenas `x-ingestion-key`. Use HTTPS fora do ambiente local. Não envie a chave de ingestão ao frontend.

| Recurso | Rotas |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me` |
| Usuários | `GET/POST /usuarios`, `GET/PATCH /usuarios/:id` (administração) |
| Cruzamento e vias | `GET /cruzamento`, `GET /vias`, `GET /vias/:codigo` |
| Dispositivos | `GET/POST /dispositivos`, `GET/PATCH /dispositivos/:id` |
| Semáforos | `GET /semaforos`, `GET /semaforos/:id` |
| Leituras | `GET/POST /leituras` |
| Fases | `GET/POST /historico-fases` |
| Alertas | `GET/POST /alertas`, `GET/PATCH /alertas/:id`, `PATCH /alertas/:id/reconhecer`, `PATCH /alertas/:id/resolver` |
| Telemetria | `GET/POST /telemetria` |
| Eventos | `GET/POST /eventos` |
| Dashboard | `GET /dashboard/resumo` |
| Health | `GET /health` |

Listagens de leituras, alertas, telemetria, fases e eventos usam `pagina` (1+) e `limite` (1–100). Aceitam `inicio` e `fim` em ISO 8601 e `ordem=asc|desc` por data (padrão: descendente). Leituras também aceitam `via=A|B`, `tipoLeitura=QUADRO|AGREGADA` e `dispositivoId`. O retorno é `{dados,total,pagina,limite}`. IDs são strings; campos do banco chegam em camelCase; datas em UTC ISO 8601. Erros usam `{statusCode,error,timestamp}`.

Exemplo de login:

```http
POST /api/v1/auth/login
Content-Type: application/json

{"email":"admin@exemplo.com","senha":"minha-senha-forte"}
```

Exemplo de leitura enviada pelo Python:

```http
POST /api/v1/leituras
x-ingestion-key: <chave-do-servidor>
Content-Type: application/json

{"identificadorEvento":"0f7c9f4d-d88e-4a7a-a257-3508d77a7d2b","dispositivoId":"1","via":"A","registradoEm":"2026-11-03T12:00:00.000Z","tipoLeitura":"QUADRO","carrosDetectados":2,"pedestresDetectados":1}
```

O Python deve identificar a via de forma confiável e reutilizar o UUID ao reenviar. A restrição única `(dispositivo_id, identificador_evento)` garante a deduplicação mesmo com concorrência. Contagem por quadro não equivale a veículos únicos; campos não medidos ficam nulos. Erros comuns: 400 (validação), 401 (credencial), 403 (nível), 404 (registro), 409 (duplicado/transição), 422 (restrição do banco), 429 (limite).

## Prisma e estrutura

`prisma/schema.prisma` foi gerado por `prisma db pull` a partir do MySQL local V2.1. A coluna gerada `historico_fases.semaforo_fase_aberta` foi marcada `@ignore` para impedir escrita; o índice único continua no SQL. Após uma migração oficial do repositório database, atualize o banco local, execute `npm run prisma:pull`, revise o diff e gere o client.

`src/modules` contém controllers por recurso; `src/common` concentra validação, serialização e guards; `src/prisma` gerencia a conexão. A API registra fases reportadas em transação, com bloqueio por semáforo para impedir sobreposição. O último estado do semáforo é informação recebida, não confirmação elétrica nem comando físico.

## Testes

```powershell
npm run lint
npm test
npm run build
```

Para integração, crie `smarttraffic_api_teste` no MySQL local, execute nele `sql/00_preparacao.sql`, `sql/01_schema.sql`, `sql/02_seed_maquete.sql` do repositório database e configure `DATABASE_URL` para **esse** banco. Depois:

```powershell
cd ../database
'CREATE DATABASE IF NOT EXISTS smarttraffic_api_teste CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;' | docker compose exec -T mysql sh -c 'export MYSQL_PWD=$MYSQL_ROOT_PASSWORD; exec mysql -uroot'
docker compose exec -T mysql sh -c 'set -e; export MYSQL_PWD=$MYSQL_ROOT_PASSWORD; mysql -uroot -D smarttraffic_api_teste < /smarttraffic/sql/00_preparacao.sql; mysql -uroot -D smarttraffic_api_teste < /smarttraffic/sql/01_schema.sql; mysql -uroot -D smarttraffic_api_teste < /smarttraffic/sql/02_seed_maquete.sql; mysql -uroot -D smarttraffic_api_teste < /smarttraffic/sql/03_verificacao_seed.sql'
cd ../api
# Use no processo uma DATABASE_URL com /smarttraffic_api_teste e usuário com acesso a esse banco.
npm run test:integration
```

A suíte recusa URLs sem `teste`. O CI monta um MySQL temporário, aplica o SQL oficial no banco isolado e executa lint, testes e build. Não roda testes na Aiven.

## Limitações e próximos passos

- O frontend React atual usa mocks de cinco cruzamentos e campos que não existem no banco V2.1. A integração deve adaptar o provider aos dados reais de um cruzamento, sem mudar o SQL para imitar mocks.
- Ainda faltam o cliente Python enviando UUID/via confiáveis, o aplicativo mobile e a implantação HTTPS da API. O controlador local continua responsável pela segurança dos LEDs.
- O repositório `computer-vision` atualmente mostra um servidor Flask de streaming de câmera, sem envio de detecções para a API; `Mobile` ainda não define contratos de cliente. A integração precisa ser implementada nesses projetos posteriormente. O firmware Arduino recebe comandos locais por serial; esta API não envia esses comandos.
- O Swagger descreve DTOs e rotas, mas os contratos de resposta específicos podem receber exemplos adicionais quando web/mobile forem integrados.
