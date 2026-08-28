# Helpdesk TI

Helpdesk interno pequeno: solicitantes abrem e acompanham chamados; agentes atendem a fila. Veja o "porquê" de cada decisão em [`specs/`](specs/README.md).

## Pré-requisitos

- Python 3.12+
- Node.js 22+ e npm
- [uv](https://docs.astral.sh/uv/) (gerenciador de ambiente Python)

## Instalação

```bash
# Backend
cd backend
uv venv --python 3.12
uv pip install -e ".[dev]"
cp ../.env.example ../.env

# Frontend
cd ../frontend
npm install
```

## Migração do banco

A partir de `backend/`, com o ambiente virtual ativado (ou usando `.venv/bin/`):

```bash
.venv/bin/alembic upgrade head
```

O banco padrão fica em `backend/data/helpdesk.db` (configurável por `SQLITE_DATABASE_PATH`).

## Criar usuários

Não há cadastro pela UI. Crie um solicitante e um agente com o comando administrativo:

```bash
.venv/bin/python -m app.provision_user \
  --name "Maria Silva" --email maria@example.test --role REQUESTER --password "senha-forte-1"

.venv/bin/python -m app.provision_user \
  --name "Ana Agente" --email ana@example.test --role AGENT --password "senha-forte-2"
```

O comando é idempotente: rodar de novo com o mesmo e-mail atualiza a conta existente.

## Executar em desenvolvimento

```bash
# Terminal 1 — backend (a partir de backend/)
.venv/bin/uvicorn app.main:app --reload

# Terminal 2 — frontend (a partir de frontend/)
npm run dev
```

Acesse `http://localhost:5173`. O Vite faz proxy de `/api` para `http://127.0.0.1:8000`.

## Testes e gates

Backend (a partir de `backend/`):

```bash
.venv/bin/ruff format --check .
.venv/bin/ruff check .
.venv/bin/pytest
```

Frontend (a partir de `frontend/`):

```bash
npm run lint
npm run test -- --run
npm run build
```

Migração, com um arquivo SQLite descartável:

```bash
SQLITE_DATABASE_PATH=/tmp/helpdesk-check.db .venv/bin/alembic upgrade head
SQLITE_DATABASE_PATH=/tmp/helpdesk-check.db .venv/bin/alembic downgrade base
SQLITE_DATABASE_PATH=/tmp/helpdesk-check.db .venv/bin/alembic upgrade head
```

Cobertura mínima exigida: 80% de linhas em backend e frontend (aplicada automaticamente pelos comandos acima).

## Estrutura

```text
backend/app/{auth,tickets}/   # routers, services, regras, schemas, models
backend/migrations/           # Alembic
backend/tests/                # Pytest
frontend/src/{api,auth,components,pages,styles,domain,test}/
specs/                        # especificação normativa do produto
.github/workflows/ci.yml      # mesmos gates do desenvolvimento local
```
