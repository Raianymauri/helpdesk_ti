# Spec 02 — Arquitetura técnica

## Decisão central

O MVP é um monólito modular pequeno:

```text
Browser -> React SPA -> HTTP/JSON -> FastAPI -> arquivo SQLite local
```

Não existe servidor de banco, Docker obrigatório, microsserviço ou infraestrutura distribuída.

## Stack obrigatória

### Backend

- Python 3.12, registrado em `.python-version` e no CI;
- uv como único gerenciador Python, com `pyproject.toml` e `uv.lock` versionado;
- FastAPI;
- Pydantic;
- SQLAlchemy 2 em modo síncrono;
- Alembic com uma migração inicial;
- `sqlite3` da biblioteca padrão;
- biblioteca mantida com Argon2id para senha;
- Pytest e Ruff.

### Frontend

- Node.js 24 LTS, registrado em `.nvmrc` e no CI;
- npm como único gerenciador frontend, com `package-lock.json` versionado;
- React.js 19 em JavaScript moderno/JSX;
- Vite;
- React Router;
- `fetch` nativo encapsulado;
- CSS nativo com tokens;
- Vitest, provider de coverage, React Testing Library, ESLint e Prettier.

### Projeto

- GitHub Actions para CI;
- `uv.lock` e `package-lock.json` versionados e usados em modo frozen/`npm ci` no CI;
- sem TypeScript, Docker, cliente HTTP externo, biblioteca visual, store global ou ferramenta de monorepo.

Antes do bootstrap, a IA deve conferir a documentação oficial atual e escolher versões estáveis compatíveis. Nunca usar `latest` em CI.

## Estrutura inicial

```text
helpdesk_ti/
├── backend/
│   ├── app/
│   │   ├── auth/
│   │   │   ├── models.py
│   │   │   ├── router.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   ├── tickets/
│   │   │   ├── models.py
│   │   │   ├── router.py
│   │   │   ├── rules.py
│   │   │   ├── schemas.py
│   │   │   └── service.py
│   │   ├── config.py
│   │   ├── database.py
│   │   └── main.py
│   ├── migrations/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   └── test_tickets.py
│   ├── pyproject.toml
│   └── uv.lock
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   │   ├── global.css
│   │   │   └── tokens.css
│   │   ├── test/
│   │   │   └── setup.js
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── package-lock.json
├── specs/
├── .github/workflows/ci.yml
├── .env.example
├── .gitignore
├── .nvmrc
├── .python-version
├── CLAUDE.md
├── PROMPT_MESTRE.md
└── README.md
```

A árvore é uma direção, não uma obrigação de criar arquivo vazio. Não criar `repository`, `use_cases`, `adapters`, `domain`, `helpers`, `common` ou `utils` sem necessidade concreta.

Testes de componentes podem ficar ao lado do componente. Pastas novas exigem uma responsabilidade clara.

## Limites de responsabilidade

Backend:

```text
router -> schemas + service -> rules + models/session
```

- router trata HTTP e delega;
- service coordena autorização, transação e persistência;
- rules contém transições puras, sem FastAPI/SQLAlchemy;
- schemas são contratos de entrada/saída;
- models são persistência SQLite.

Não criar uma camada de repositório para uma única implementação SQLite. Queries simples podem viver no service, próximas do caso de uso.

Frontend:

```text
page -> components -> api client
```

- página orquestra dados e navegação;
- componente recebe props/callbacks explícitos;
- módulo de API centraliza URL, `credentials: "include"`, JSON e erros; o cookie HttpOnly é gerenciado pelo navegador e nunca lido pelo JavaScript;
- estado local por padrão;
- um contexto pequeno de autenticação é permitido;
- Effects apenas para sincronização externa.

## SQLite: única persistência

- Arquivo configurável, default de desenvolvimento `data/helpdesk.db`.
- Aplicação e Alembic criam o diretório pai configurado antes de abrir o arquivo.
- Arquivos `.db`, `.sqlite`, `.sqlite3`, `-wal` e `-shm` nunca são versionados.
- Testes usam arquivo temporário exclusivo; não usam banco de desenvolvimento e não dependem de ordem.
- `PRAGMA foreign_keys = ON` em toda conexão.
- `PRAGMA journal_mode = WAL` no arquivo persistente.
- `PRAGMA busy_timeout = 5000` em toda conexão.
- Transações de escrita são curtas e atômicas.
- O arquivo fica em disco local, nunca NFS/SMB.

WAL permite leitores durante uma escrita, mas SQLite continua com apenas um escritor por vez. O MVP assume uma única instância FastAPI e carga pequena. Não prometer escala horizontal.

## Migrações

- Alembic contém uma migração inicial reproduzível.
- O schema não é criado automaticamente no startup.
- A aplicação falha de forma clara se o arquivo não estiver migrado.
- CI aplica migrações em SQLite vazio antes dos testes de integração.
- Alteração futura de schema atualiza migração/spec na mesma PR.

## Autenticação

- Sessão first-party por cookie `helpdesk_session`.
- Token aleatório com ao menos 256 bits; banco armazena apenas hash.
- Expiração absoluta padrão de 8 horas.
- Logout invalida no SQLite e expira cookie.
- Cookie de produção: `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Mutação autenticada valida `Origin` configurada.
- Token nunca vai para `localStorage` ou `sessionStorage`.

Em produção, frontend e `/api` devem usar a mesma origem. Em desenvolvimento, o proxy do Vite encaminha `/api` ao FastAPI.

## Configuração

Variáveis mínimas:

- `APP_ENV`;
- `SQLITE_DATABASE_PATH`;
- `SESSION_TIMEOUT_MINUTES`;
- `SESSION_COOKIE_SECURE`;
- `ALLOWED_ORIGIN`.

`.env.example` usa somente valores fictícios. Configuração obrigatória é validada no startup. Segredo ou senha real nunca entra no repositório.

## Datas e integridade

- IDs usam `INTEGER PRIMARY KEY` do SQLite.
- Foreign keys e constraints duplicam invariantes persistentes importantes.
- Datas são geradas pelo servidor, normalizadas em UTC e serializadas em RFC 3339 com `Z`.
- E-mail normalizado tem unique constraint.
- Assumir/liberar chamado e mudar seu estado são operações transacionais.
- Conteúdo do usuário não aparece em logs.

## Dependências e simplicidade

Adicionar dependência somente quando ela reduzir mais complexidade do que introduz. Antes de adicioná-la, conferir manutenção, licença, segurança e documentação atual.

Proibido no MVP:

- outro banco ou abstração multi-banco;
- async SQLAlchemy sem necessidade medida;
- Redis, cache, filas e tarefas em background;
- WebSocket, GraphQL e microsserviços;
- repository pattern ou arquitetura hexagonal;
- Redux, React Query, Axios, CSS framework e design system;
- Playwright, Storybook, testes de carga e regressão visual;
- telemetria ou observabilidade externa.
