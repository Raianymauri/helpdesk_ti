# Prompt único — construir e publicar todo o Helpdesk TI

> Envie todo o conteúdo deste arquivo, sem remover seções, a uma IA de programação com acesso a terminal, Git e GitHub.

## Missão

Atue como Principal Software Engineer e arquiteto responsável pela entrega completa. Faça o bootstrap do MVP se o repositório estiver vazio; caso contrário, integre-se à estrutura existente sem substituir trabalho alheio. Documente, implemente, teste, versione todos os artefatos e abra a pull request no repositório oficial.

Use sua capacidade máxima de análise, programação, depuração e revisão. Raciocine profundamente de forma interna, sem expor cadeia de pensamento. Comunique somente decisões, premissas, resultados e evidências verificáveis.

Não entregue apenas plano, scaffold, pseudocódigo, demonstração ou implementação parcial. Não pare depois de criar documentação. Continue autonomamente até código, testes, CI, commits, push e PR, corrigindo falhas encontradas.

## Condição terminal obrigatória

Sua tarefa termina somente quando:

1. o MVP estiver funcional de ponta a ponta no escopo exato deste prompt;
2. `PROMPT_MESTRE.md`, `CLAUDE.md`, specs, código, testes, migração, README e CI estiverem rastreados pelo Git;
3. todos os gates locais e checks obrigatórios do GitHub passarem;
4. a branch `feat/initial-helpdesk-mvp` estiver enviada ao `origin`;
5. uma pull request dessa branch para `main` estiver aberta;
6. a existência da PR, sua URL e os arquivos publicados no diff tiverem sido confirmados;
7. `PROMPT_MESTRE.md`, `CLAUDE.md`, todas as specs e o template de PR aparecerem no diff remoto;
8. sua resposta final informar apenas resultados realmente verificados.

Código existente apenas localmente não é entrega concluída. Este prompt autoriza criar branch, arquivos, commits, fazer push da branch e abrir/atualizar a PR. Não autoriza merge, deploy, alteração de proteção da `main`, force-push ou exclusão de dados.

Se credenciais, permissão de escrita ou indisponibilidade externa realmente impedirem push/PR, conclua tudo o que ainda for seguro localmente, mostre o erro exato e não declare sucesso. Nenhum prompt consegue superar ausência de autenticação no GitHub.

## Repositório e Git

- Repositório oficial: `https://github.com/Raianymauri/helpdesk_ti.git`.
- Branch base: `main`; confirme no remoto antes de trabalhar.
- Branch obrigatória do MVP: `feat/initial-helpdesk-mvp`.
- Padrões futuros: `feat/<slug-em-kebab-case>` e `fix/<slug-em-kebab-case>`.
- Uma branch/PR representa uma alteração lógica.
- Nunca faça push direto para `main`.
- Nunca use `reset --hard`, force-push ou comando que apague trabalho existente.
- Preserve qualquer conteúdo preexistente não conflitante.

Resolva primeiro a raiz com `git rev-parse --show-toplevel` e normalize o `origin` para confirmar que pertence a `Raianymauri/helpdesk_ti`. Só reutilize o diretório se essa identidade corresponder. Caso contrário, clone em um diretório novo e seguro, defina explicitamente a nova raiz e execute todas as etapas dentro dela. Antes de editar, faça preflight de status, remoto, branch default, autenticação (`gh auth status`), Python e Node. Se `gh` não existir, use integração GitHub autenticada equivalente; só considere bloqueio quando não houver nenhum meio autorizado de criar e verificar a PR.

Se `feat/initial-helpdesk-mvp` ou sua PR já existir, inspecione e continue de forma idempotente em vez de criar duplicata.

No bootstrap inicial, a precedência é: solicitação atual → este `PROMPT_MESTRE.md` → specs → `CLAUDE.md` → implementação/testes existentes. As specs organizam este prompt e não podem ampliar ou contradizer seu escopo.

## Produto a construir

Crie um helpdesk interno pequeno e bem fundamentado. Solicitantes registram e acompanham problemas. Agentes veem a fila, assumem chamados, respondem e resolvem.

A sofisticação deve vir da correção, segurança, clareza, acessibilidade e testes — nunca do volume de features ou camadas.

### Atores

`REQUESTER`:

- autentica, encerra sessão;
- cria chamado;
- lista e abre somente os próprios chamados;
- comenta nos próprios chamados;
- reabre chamado próprio resolvido.

`AGENT`:

- autentica, encerra sessão;
- lista e abre todos os chamados;
- pesquisa e filtra a fila;
- assume chamado para si ou libera o próprio chamado;
- altera prioridade;
- resolve ou reabre o chamado que assumiu;
- comenta em qualquer chamado.

Contas são provisionadas por um comando administrativo idempotente. Não existe cadastro ou gestão de usuários na UI.

### Entidades

`User`:

- ID inteiro;
- nome de exibição, 2–100;
- e-mail normalizado e único;
- hash de senha;
- papel `REQUESTER | AGENT`;
- data de criação UTC.

`Session`:

- ID inteiro;
- hash único de token opaco;
- usuário;
- criação e expiração absoluta.

`Ticket`:

- ID inteiro exibido como `#<id>`;
- título, 5–160;
- descrição, 10–5.000;
- estado `OPEN | IN_PROGRESS | RESOLVED`;
- prioridade `LOW | MEDIUM | HIGH`, default `MEDIUM`;
- solicitante;
- agente responsável opcional;
- criação e atualização UTC.

`Comment`:

- ID inteiro;
- chamado e autor;
- corpo, 1–2.000 após trim;
- criação UTC.

### Regras obrigatórias

1. Chamado nasce `OPEN`, sem responsável e com prioridade `MEDIUM` quando omitida.
2. Solicitante acessa somente chamados próprios; tentativa sobre chamado alheio responde como inexistente.
3. Título, descrição e comentários são texto simples; nunca interpretar HTML.
4. Título, descrição e comentários não são editados nem excluídos.
5. Agente assume apenas chamado `OPEN` e sem responsável; a operação define o agente atual e `IN_PROGRESS` atomicamente.
6. Dois agentes nunca conseguem assumir o mesmo chamado; o perdedor recebe conflito.
7. Somente o responsável libera o chamado; liberar remove responsável e retorna a `OPEN` atomicamente.
8. Somente o responsável faz `IN_PROGRESS → RESOLVED`.
9. Responsável ou solicitante proprietário faz `RESOLVED → IN_PROGRESS`.
10. Qualquer agente altera prioridade; solicitante escolhe prioridade somente ao criar.
11. Usuário autorizado comenta em qualquer estado; comentar atualiza `updated_at` na mesma transação.
12. Toda mutação efetiva de claim, release, status, prioridade ou comentário atualiza `updated_at`; no-op não altera a data.
13. Backend é fonte de verdade para autorização, defaults, datas e transições.
14. Qualquer transição não listada é inválida e não persiste estado parcial.

### Escopo explicitamente proibido

Não implemente:

- dashboard, relatórios ou métricas;
- anexos, e-mail, push, notificações ou tempo real;
- SLA, categorias, notas internas ou respostas prontas;
- edição/exclusão e ações em lote;
- atribuição a outro agente;
- cadastro, recuperação de senha ou administração na UI;
- integrações externas, deploy ou serviço cloud;
- outro banco além de SQLite;
- Docker obrigatório, Redis, cache, filas, workers ou microsserviços;
- GraphQL, WebSocket ou event sourcing;
- TypeScript, Redux, React Query, Axios, CSS framework ou biblioteca de componentes;
- design system separado, Storybook, Playwright, testes de carga ou regressão visual;
- arquitetura hexagonal, repository pattern ou framework interno.

Não crie tabela, endpoint, pasta, botão desabilitado, configuração ou `TODO` para item fora do escopo.

## Stack obrigatória

Backend:

- Python 3.12, registrado em `.python-version`;
- uv como único gerenciador Python, com `pyproject.toml` e `uv.lock`;
- FastAPI, Pydantic, SQLAlchemy 2 síncrono e Alembic;
- SQLite via `sqlite3` da biblioteca padrão;
- biblioteca mantida com Argon2id para hashing;
- Pytest, coverage e Ruff.

Frontend:

- Node.js 24 LTS, registrado em `.nvmrc`;
- npm como único gerenciador frontend, com `package-lock.json`;
- React.js 19 com JavaScript/JSX;
- Vite e React Router;
- `fetch` nativo encapsulado;
- CSS nativo com custom properties;
- Vitest com provider de coverage, React Testing Library, ESLint e Prettier.

Projeto:

- persistência somente em SQLite local; nenhum servidor de banco;
- GitHub Actions;
- `uv.lock` e `package-lock.json` versionados; CI usa uv frozen e `npm ci`;
- sem Docker ou ferramenta de monorepo.

Antes de usar APIs de bibliotecas, consulte a documentação oficial atual, preferencialmente via Context7. Escolha versões estáveis compatíveis, fixe-as nos manifests/lockfiles e não use `latest` em automação.

## Arquitetura pequena

Use um monólito modular:

```text
Browser -> React SPA -> /api -> FastAPI -> arquivo SQLite local
```

Backend:

- routers tratam HTTP e delegam;
- services coordenam autorização, transação e persistência;
- regras de transição ficam em funções puras;
- schemas não são modelos ORM;
- queries simples podem ficar no service;
- não crie repository/interface para uma única implementação.

Frontend:

- páginas orquestram dados/navegação;
- componentes recebem props/callbacks claros;
- módulos de API centralizam URL, `credentials: "include"`, JSON e erros; o cookie HttpOnly pertence ao navegador e nunca é lido pelo JavaScript;
- estado local por padrão, com apenas um contexto pequeno de autenticação;
- Effects somente para sincronização externa;
- não armazene valor que pode ser derivado.

Estrutura mínima esperada, sem criar arquivos vazios:

```text
backend/app/{auth,tickets}/
backend/migrations/
backend/tests/
frontend/src/{api,components,pages,styles,test}/
specs/
.github/workflows/ci.yml
.github/pull_request_template.md
.env.example
.gitignore
.nvmrc
.python-version
CLAUDE.md
PROMPT_MESTRE.md
README.md
```

Não crie pastas genéricas `helpers`, `common`, `utils`, `adapters` ou `use_cases` sem necessidade real.

## SQLite somente

- Default de desenvolvimento: `data/helpdesk.db`, configurável por `SQLITE_DATABASE_PATH`.
- Aplicação e Alembic criam o diretório pai configurado antes de abrir o arquivo.
- Testes usam arquivo SQLite temporário e isolado, nunca o banco de desenvolvimento.
- Ative `PRAGMA foreign_keys = ON` em toda conexão.
- Use WAL no arquivo persistente e `busy_timeout = 5000`.
- Use transações de escrita curtas e queries parametrizadas/ORM.
- Crie apenas índices usados pelas queries reais: e-mail/token únicos, tickets por solicitante/status + atualização e comentários por ticket + criação.
- Assuma uma única instância do backend e carga pequena; SQLite permite apenas um escritor por vez.
- Nunca use SQLite em filesystem de rede.
- Crie uma migração Alembic inicial; não crie schema automaticamente no startup.
- Valide upgrade, downgrade e novo upgrade em arquivo vazio.
- Ignore no Git `.db`, `.sqlite`, `.sqlite3`, `-wal` e `-shm`.

## Autenticação e segurança

- Use sessão first-party com token aleatório de pelo menos 256 bits.
- Envie token somente em cookie `helpdesk_session`.
- Persista apenas o hash do token.
- Expiração absoluta default de 8 horas.
- Logout invalida sessão e expira cookie.
- Produção: cookie `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`.
- Desenvolvimento usa proxy Vite para manter `/api` na mesma origem.
- Mutação autenticada valida `Origin` configurada.
- Nunca use `localStorage`/`sessionStorage` para token.
- Nunca registre senha, token, cookie, descrição ou comentário.
- Segredos somente em ambiente; `.env.example` usa valores fictícios.
- Senha incorreta e usuário inexistente usam resposta pública idêntica.
- Forneça `uv run python -m app.create_user --display-name <nome> --email <email> --role <REQUESTER|AGENT>`. A senha de 12–128 caracteres é lida duas vezes por prompt oculto ou stdin seguro, nunca por argumento. Se o e-mail já existir, não altera nada e termina com sucesso.

## API obrigatória

Prefixo `/api`, JSON `snake_case`, datas RFC 3339 UTC, erros compactos e estáveis.

Endpoints:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me
GET    /api/tickets
POST   /api/tickets
GET    /api/tickets/{id}
POST   /api/tickets/{id}/claim
DELETE /api/tickets/{id}/claim
PATCH  /api/tickets/{id}
POST   /api/tickets/{id}/comments
```

`GET /api/tickets` aceita somente `q`, `status`, `page` e `page_size` (default 20, máximo 100), ordena por atualização/ID decrescente e retorna `{items, page, page_size, total}`. `q` pesquisa ID ou título. Cada `TicketSummary` contém ID/número, título, status, prioridade, solicitante, responsável e `updated_at`.

`TicketDetail` acrescenta descrição, `created_at` e comentários ordenados. Criar retorna `201 TicketDetail`; detalhe, claim, release e patch retornam `200 TicketDetail`; comentar retorna `201 TicketDetail`. Assim o frontend sempre aplica o estado devolvido pelo servidor.

`PATCH` aceita `status` e/ou `priority` e aplica exatamente as permissões/regras acima. Autorize todos os campos antes de comparar valores. Reenviar um valor atual é no-op idempotente, retorna `200` e não muda `updated_at`; isso não contorna autorização. Claim usa alteração condicional atômica. Toda mutação efetiva atualiza `updated_at`.

O `PATCH` inteiro é atômico: se qualquer campo for inválido ou não autorizado, nenhum campo é alterado.

Erros usam `detail` com `code`, `message` e `fields`; `fields` é um objeto JSON que mapeia nome do campo para uma mensagem. Status mínimos: `401` autenticação, `403` permissão/origem, `404` invisível/inexistente, `409` claim/transição, `422` validação e `500` genérico. Não exponha SQL, stack trace, hashes ou caminho do arquivo.

OpenAPI fica disponível em desenvolvimento/teste e desabilitado em produção.

## Frontend obrigatório

Quatro páginas:

1. `/login`;
2. `/tickets` — “Meus chamados” ou “Fila de chamados” conforme papel;
3. `/tickets/new` — somente solicitante;
4. `/tickets/:id` — detalhe, comentários e ações permitidas.

Não criar dashboard ou sidebar. Use header, navegação curta e main com um `h1`.

Usuário não autenticado vai para `/login`; login bem-sucedido sempre vai para `/tickets`. `401 AUTHENTICATION_REQUIRED` ou logout limpam o estado local e retornam a `/login`.

Lista:

- busca por ID/título;
- filtro de status;
- cards responsivos com número, título, status, prioridade, responsável e atualização;
- paginação anterior/próxima;
- filtros refletidos na query string;
- alterar busca/status redefine `page=1`; query inválida é normalizada para defaults;
- estados carregando, vazio, erro recuperável e conteúdo.

Formulários:

- labels visíveis e erros associados aos campos;
- validação coerente com a API;
- impedir envio duplicado;
- preservar dados não sensíveis após falha;
- foco no primeiro campo inválido;
- sucesso navega para o recurso criado/atualizado.

Detalhe:

- texto do usuário renderizado como texto, nunca HTML;
- agente pode assumir, liberar, resolver, reabrir e alterar prioridade conforme permissão;
- solicitante pode reabrir seu resolvido;
- qualquer usuário autorizado comenta;
- conflitos do servidor geram mensagem e atualização segura da tela.

## Visual e acessibilidade

Somente preto, branco e cinzas. Centralize tokens CSS, por exemplo:

```css
--color-background: #f7f7f7;
--color-surface: #ffffff;
--color-text: #111111;
--color-text-muted: #5f5f5f;
--color-border: #737373;
--color-subtle: #e8e8e8;
--color-primary: #000000;
--color-on-primary: #ffffff;
```

- WCAG 2.2 AA;
- corpo mínimo 16 px e fonte do sistema;
- contraste 4,5:1 para texto normal;
- foco visível;
- fluxo completo por teclado;
- alvo interativo mínimo 44 × 44 CSS px;
- status/prioridade sempre com texto, nunca apenas tonalidade;
- HTML semântico e `lang="pt-BR"`;
- layout sem rolagem horizontal a partir de 320 CSS px e funcional com zoom 200%;
- sem gradientes, sombras ornamentais ou animações necessárias.

## Documentação que deve ir ao repositório

Antes ou junto do código, crie e mantenha consistentes:

```text
PROMPT_MESTRE.md
CLAUDE.md
specs/README.md
specs/01-produto.md
specs/02-arquitetura.md
specs/03-api-backend.md
specs/04-frontend-ux.md
specs/05-qualidade-testes.md
specs/06-fluxo-git.md
```

- Salve este prompt autocontido como `PROMPT_MESTRE.md`, preservando todas as decisões normativas.
- `CLAUDE.md` deve transformar DRY, KISS, YAGNI, nomenclatura, workflow spec-driven, segurança, testes e Git em regras permanentes.
- As specs devem organizar fielmente este prompt, sem ampliar o escopo.
- `README.md` deve ser curto e trazer pré-requisitos, instalação, migração, criação dos dois tipos de usuário, execução, testes e estrutura.
- Crie `.github/pull_request_template.md` curto com `Resumo`, `Validação` e `Referência`.

Depois de adicionar os artefatos ao índice e antes da PR, execute e registre o resultado de:

```bash
git ls-files PROMPT_MESTRE.md CLAUDE.md specs .github/pull_request_template.md
```

Todos os artefatos acima devem aparecer como rastreados. Depois do commit, `git status --short` deve estar limpo e `git diff --name-only origin/main...HEAD` deve incluir os artefatos da entrega. Depois do push/PR, confirme novamente com `gh pr diff --name-only` que `PROMPT_MESTRE.md`, `CLAUDE.md`, todas as specs, o template e o workflow de CI estão no diff remoto.

## Regras de código não negociáveis

### DRY

Centralize conhecimento/regra que precisa permanecer consistente. Não abstraia linhas apenas parecidas. Pequena duplicação é melhor que uma abstração errada.

### KISS

Escolha o fluxo mais explícito e a menor quantidade de camadas que resolva integralmente o requisito. Simplicidade não elimina validação, segurança, erro ou teste.

### YAGNI

Não implemente flexibilidade, configuração, endpoint ou dependência para uso futuro. Tudo precisa ter consumidor atual no escopo.

### Nomes autoexplicativos

- Código em inglês; UI e documentação funcional em pt-BR.
- Funções usam verbos claros; classes/componentes usam substantivos claros.
- Booleanos começam com `is`, `has`, `can` ou `should`.
- Coleções ficam no plural; unidades aparecem no nome.
- Evite `data`, `item`, `obj`, `temp`, `utils`, `manager`, `handler`, `process` e abreviações quando houver termo de domínio preciso.
- Comentário explica “por quê”, não traduz o código.
- Proibidos código comentado, logs de debug, placeholder, mock em produção, `TODO` ou `FIXME` escondendo trabalho incompleto.

## Testes e gates

Backend deve testar:

- login válido/inválido, sessão expirada e logout;
- criação/validação/listagem/detalhe;
- isolamento de chamados do solicitante;
- busca, filtro, paginação e ordem;
- claim com duas sessões independentes competindo pela atualização condicional, sem sleeps, além de release e transições;
- prioridade e comentários;
- rollback e foreign keys habilitadas;
- migração em SQLite vazio.

Frontend deve testar:

- login e erros;
- logout e sessão expirada;
- estados carregando/vazio/erro/conteúdo;
- busca, filtro e paginação;
- criação com validação, falha preservada e sucesso;
- detalhe, ações por papel/estado e comentários;
- prevenção de envio duplicado;
- nomes/labels acessíveis e status textual.

Cobertura mínima: 80% de linhas no backend e frontend; regras de autorização/transição devem ter todos os caminhos da matriz. Configure `pytest-cov` em `addopts` com `--cov=app --cov-report=term-missing --cov-fail-under=80`. Configure o script `test:coverage` do frontend para Vitest com coverage e threshold de linhas em 80%.

Gates obrigatórios:

Backend, no diretório `backend/`:

```bash
uv sync --frozen --all-groups
uv run ruff format --check .
uv run ruff check .
uv run pytest
```

Frontend, no diretório `frontend/`:

```bash
npm ci
npm run format:check
npm run lint
npm run test:coverage
npm run build
```

Migração, no diretório `backend/`, usando arquivo SQLite descartável:

```bash
export SQLITE_DATABASE_PATH="$(mktemp -d)/migration-check.db"
uv run alembic upgrade head
uv run alembic downgrade base
uv run alembic upgrade head
```

O round-trip nunca usa o banco de desenvolvimento. CI executa os mesmos gates. Não reduza threshold, pule teste, ignore warning ou use retry para esconder falha. Corrija a causa e rode novamente.

Faça também smoke manual: solicitante faz login/cria/lista/abre/comenta; agente faz login/assume/muda prioridade/resolve/reabre/libera; navegação por teclado e tela de 320 px.

## Sequência autônoma obrigatória

1. Leia integralmente este prompt.
2. Inspecione repositório, histórico, remotos, branch e alterações existentes.
3. Verifique cedo GitHub CLI, autenticação, Python e Node.
4. Consulte documentação atual das ferramentas.
5. Atualize `main` de forma segura e crie/reutilize `feat/initial-helpdesk-mvp` antes de editar.
6. Salve este prompt, crie `CLAUDE.md` e todas as specs.
7. Revise a documentação contra este prompt e elimine contradições.
8. Implemente backend e frontend em pequenas fatias verticais.
9. Crie migração, testes, `.env.example`, `.gitignore`, README, template de PR e CI.
10. Execute todos os gates; depure e corrija até passarem.
11. Faça o smoke manual possível no ambiente.
12. Revise o diff como um segundo engenheiro: escopo, nomes, segurança, autorização, concorrência, acessibilidade, segredos e arquivos acidentais.
13. Adicione somente arquivos do MVP ao índice e confirme que prompt/specs e todos os artefatos obrigatórios estão rastreados.
14. Crie commits coesos e curtos.
15. Faça push de `feat/initial-helpdesk-mvp`.
16. Abra ou atualize a PR para `main`.
17. Confirme a URL e inspecione `gh pr diff --name-only` para provar que código, prompt, specs, template e CI foram publicados.
18. Aguarde os checks obrigatórios da PR com `gh pr checks --watch`; se falharem, corrija, teste, envie novo commit e aguarde novamente.
19. Confirme checks verdes e não faça merge.

Não peça confirmação entre etapas. Pergunte somente diante de bloqueio externo real, conflito que possa apagar trabalho, falta de permissão ou decisão ausente que altere segurança/perda de dados.

## Pull request

Título:

```text
feat: build initial helpdesk MVP
```

Descrição curta, sem texto óbvio:

```md
## Resumo
- Implementa o fluxo essencial de chamados para solicitantes e agentes.
- Adiciona SQLite, testes automatizados e CI.
- Versiona prompt, regras de engenharia e specs.

## Validação
- `uv run ruff format --check . && uv run ruff check . && uv run pytest` — passou
- `npm run format:check && npm run lint && npm run test:coverage && npm run build` — passou
- migração SQLite e smoke manual — passaram

## Referência
- `specs/README.md`
```

Se ainda não houver PR para a branch, salve esse corpo em um arquivo temporário fora do repositório e execute:

```bash
gh pr create --base main --head feat/initial-helpdesk-mvp --title "feat: build initial helpdesk MVP" --body-file "$pr_body_file"
```

Adapte somente os resultados reais. Não escreva tutorial, diário, lista de arquivos ou checklist gigante. Não faça merge.

## Resposta final

Seja conciso e informe somente fatos verificados:

1. MVP entregue e não escopo preservado;
2. gates locais e checks da PR, com resultados;
3. branch e commits;
4. URL confirmada da PR;
5. bloqueio ou risco residual real, se houver.

Nunca invente teste, commit, push, status do CI ou URL da PR.
