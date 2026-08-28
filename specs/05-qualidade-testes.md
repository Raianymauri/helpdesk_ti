# Spec 05 — Testes e qualidade

## Princípio

Testar comportamento que pode quebrar o produto. Não perseguir quantidade de testes, detalhes internos ou abstrações criadas apenas para facilitar mocks.

Toda correção futura deve adicionar um teste que falhe sem a correção.

## Ferramentas

Backend:

- Pytest;
- TestClient do FastAPI;
- coverage configurado no `pyproject.toml`;
- Ruff para formato e lint;
- SQLite temporário real, sem mock de persistência.

Frontend:

- Vitest;
- React Testing Library;
- ambiente DOM de teste;
- ESLint;
- mocks somente na fronteira HTTP.

Não adicionar Playwright, snapshot extenso, teste de carga, mutação, regressão visual ou matriz multibrowser no MVP.

## Testes obrigatórios do backend

### Autenticação

- login válido cria cookie e `/api/auth/me` retorna usuário;
- senha errada e usuário inexistente retornam resposta pública equivalente;
- sessão ausente, inválida e expirada falha;
- logout invalida a sessão e é idempotente;
- cookie possui flags corretas conforme ambiente.

### Chamados e autorização

- solicitante cria chamado válido com defaults;
- payload vazio, limites e campo desconhecido são rejeitados;
- solicitante lista somente os próprios;
- solicitante recebe `404` para chamado alheio;
- agente lista todos;
- busca por ID/título, filtro, ordenação e paginação funcionam;
- detalhe retorna comentários em ordem.

### Regras e concorrência

- agente assume chamado aberto;
- duas sessões independentes de agentes competem pela atualização condicional sem sleeps; somente uma assume o chamado;
- somente responsável libera e resolve;
- liberar limpa responsável e volta para `OPEN`;
- responsável resolve e reabre;
- solicitante proprietário reabre resolvido;
- transições ausentes são rejeitadas sem estado parcial;
- agente altera prioridade; solicitante não;
- comentário válido atualiza `updated_at`;
- comentário inválido não persiste;
- falha durante transação causa rollback.

### SQLite

- migração sobe em arquivo vazio;
- downgrade da migração inicial funciona;
- foreign keys estão habilitadas em toda conexão de teste;
- cada teste usa banco temporário isolado;
- arquivo de desenvolvimento nunca é aberto nos testes.

## Testes obrigatórios do frontend

### Login

- valida presença dos campos;
- impede envio duplicado;
- exibe erro genérico de credencial;
- preserva e-mail e limpa senha em erro de conexão;
- sucesso navega para a lista.
- logout e sessão expirada limpam autenticação e levam a `/login`.

### Lista

- cobre carregando, vazio, erro e conteúdo;
- mostra visão apropriada ao papel;
- busca/filtro atualizam query string e requisição;
- paginação navega sem perder filtros;
- status e prioridade possuem texto acessível.

### Criação

- valida limites antes do envio;
- associa mensagens aos campos;
- não envia formulário inválido;
- preserva dados após falha;
- sucesso navega para o detalhe.

### Detalhe

- renderiza conteúdo como texto;
- mostra ações conforme papel/estado;
- claim, release, resolve e reopen atualizam com resposta do backend;
- conflito mostra mensagem recuperável;
- comentário impede duplicidade e preserva corpo em falha.

Testes devem localizar elementos por papel, nome e label sempre que possível. Não testar nome de classe, estado interno ou sequência de implementação.

## Cobertura

- Backend: mínimo de 80% de linhas no conjunto `app`.
- Frontend: mínimo de 80% de linhas no conjunto `src`.
- Funções de autorização e transição devem ter todos os caminhos definidos na matriz testados.

`pyproject.toml` DEVE configurar `pytest-cov` em `addopts` com `--cov=app --cov-report=term-missing --cov-fail-under=80`. O script frontend `test:coverage` DEVE executar Vitest com coverage e threshold de linhas em 80%.

Cobertura é piso. Não escrever teste sem valor apenas para aumentar percentual nem excluir arquivo relevante sem justificativa.

## Gates locais e de CI

Backend, no diretório `backend/`:

```bash
uv sync --frozen --all-groups
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

`pytest` aplica o limite de cobertura pela configuração versionada.

Frontend, no diretório `frontend/`:

```bash
npm ci
npm run format:check
npm run lint
npm run test:coverage
npm run build
```

Migração, no diretório `backend/`:

```bash
export SQLITE_DATABASE_PATH="$(mktemp -d)/migration-check.db"
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic upgrade head
```

O round-trip DEVE usar esse caminho temporário exclusivo. Nunca execute downgrade no banco de desenvolvimento.

Os comandos exatos e diretórios devem constar no `README.md`. GitHub Actions executa os mesmos gates em jobs de backend e frontend. Nenhum gate pode ser silenciado, marcado como permitido falhar ou mascarado por retry.

## Verificação manual mínima

Antes da PR inicial:

1. executar login como solicitante;
2. criar, listar, abrir e comentar;
3. executar login como agente;
4. assumir, alterar prioridade, resolver, reabrir e liberar quando permitido;
5. repetir navegação essencial só com teclado;
6. conferir 320 CSS px e zoom de 200%;
7. confirmar foco visível, labels e contraste monocromático.

Registrar no PR apenas “smoke manual concluído” ou o bloqueio real; não incluir roteiro longo.

## Higiene do repositório

CI e revisão devem garantir que não foram versionados:

- `.env` ou segredos;
- arquivos SQLite e auxiliares WAL/SHM;
- `node_modules`, ambientes virtuais, caches e cobertura;
- builds locais;
- logs e screenshots temporários.

## Definição de qualidade concluída

- todos os critérios afetados têm teste apropriado;
- todos os comandos acima passam;
- migração funciona em SQLite vazio;
- nenhum teste depende de rede externa, relógio real não controlado ou ordem;
- nenhum warning relevante é ignorado;
- revisão do diff não encontra mudança fora do MVP.
