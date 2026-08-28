# Spec 03 — Backend e API

## Convenções

- Prefixo: `/api`.
- JSON UTF-8 com propriedades `snake_case`.
- IDs: inteiros positivos.
- Datas: UTC em RFC 3339 com `Z`.
- Autenticação: cookie de sessão opaco.
- `GET /api/tickets` é paginado. Como simplificação consciente do MVP, os comentários são retornados integralmente no detalhe.
- Schemas de entrada/saída explícitos; entidade ORM nunca é resposta direta.

## Modelos

### `User`

- `id: int`;
- `display_name: str` — 2–100 após trim;
- `email_normalized: str` — e-mail válido, minúsculo, único;
- `password_hash: str` — nunca exposto;
- `role: REQUESTER | AGENT`;
- `created_at`.

### `Session`

- `id: int`;
- `token_hash: str` — único;
- `user_id`;
- `created_at`, `expires_at`.

### `Ticket`

- `id: int`, exibido como `#<id>`;
- `title: str` — 5–160;
- `description: str` — 10–5.000;
- `status: OPEN | IN_PROGRESS | RESOLVED`;
- `priority: LOW | MEDIUM | HIGH`;
- `requester_id`;
- `assignee_id: int | null`;
- `created_at`, `updated_at`.

### `Comment`

- `id: int`;
- `ticket_id`;
- `author_id`;
- `body: str` — 1–2.000 após trim;
- `created_at`.

Índices mínimos: e-mail e `token_hash` únicos; tickets por `(requester_id, updated_at)` e `(status, updated_at)`; comentários por `(ticket_id, created_at)`. Não criar índice sem query correspondente.

## Autenticação

### `POST /api/auth/login`

```json
{
  "email": "maria@example.test",
  "password": "senha-informada"
}
```

Credencial válida cria sessão, define cookie e retorna o usuário. E-mail inexistente e senha incorreta retornam `401 INVALID_CREDENTIALS` com a mesma mensagem pública.

### `POST /api/auth/logout`

Invalida a sessão, expira o cookie e retorna `204`. Logout repetido é seguro.

### `GET /api/auth/me`

Retorna o usuário atual ou `401 AUTHENTICATION_REQUIRED`.

```json
{
  "id": 1,
  "display_name": "Maria Silva",
  "email": "maria@example.test",
  "role": "REQUESTER"
}
```

## Chamados

| Método e rota | Acesso | Comportamento |
|---|---|---|
| `GET /api/tickets` | Autenticado | `200` com página de `TicketSummary`. |
| `POST /api/tickets` | Solicitante | `201` com `TicketDetail`. |
| `GET /api/tickets/{id}` | Autorizado | `200` com `TicketDetail`. |
| `POST /api/tickets/{id}/claim` | Agente | `200` com `TicketDetail`. |
| `DELETE /api/tickets/{id}/claim` | Agente responsável | `200` com `TicketDetail`. |
| `PATCH /api/tickets/{id}` | Conforme campos | `200` com `TicketDetail`. |
| `POST /api/tickets/{id}/comments` | Autorizado | `201` com `TicketDetail`. |

### Criar

```json
{
  "title": "Computador não inicia",
  "description": "Ao pressionar o botão, nenhum LED acende.",
  "priority": "HIGH"
}
```

`priority` é opcional e assume `MEDIUM`. Campos desconhecidos são rejeitados.

### Listar

Query params:

- `q`: opcional, 1–100, busca case-insensitive por ID (`123` ou `#123`) ou título;
- `status`: um valor do enum;
- `page`: default 1;
- `page_size`: default 20, máximo 100.

Ordenação fixa: `updated_at DESC`, depois `id DESC`.

```json
{
  "items": [],
  "page": 1,
  "page_size": 20,
  "total": 0
}
```

Cada item usa `TicketSummary`:

```json
{
  "id": 123,
  "number": "#123",
  "title": "Computador não inicia",
  "status": "OPEN",
  "priority": "MEDIUM",
  "requester": { "id": 1, "display_name": "Maria Silva", "role": "REQUESTER" },
  "assignee": null,
  "updated_at": "2026-08-27T12:00:00Z"
}
```

### `TicketDetail`

```json
{
  "id": 123,
  "number": "#123",
  "title": "Computador não inicia",
  "description": "Ao pressionar o botão, nenhum LED acende.",
  "status": "OPEN",
  "priority": "MEDIUM",
  "requester": { "id": 1, "display_name": "Maria Silva", "role": "REQUESTER" },
  "assignee": null,
  "created_at": "2026-08-27T12:00:00Z",
  "updated_at": "2026-08-27T12:00:00Z",
  "comments": []
}
```

Resumos associados ao chamado não expõem e-mail.

Cada item de `comments` contém `id`, `body`, `author` no mesmo formato resumido e `created_at`.

### Assumir e liberar

Assumir não recebe corpo e usa alteração condicional atômica: somente `OPEN` sem responsável pode mudar para `IN_PROGRESS` com o agente atual. Se outro agente vencer a concorrência, retornar `409 TICKET_ALREADY_CLAIMED`.

Liberar não recebe corpo e é permitido somente ao responsável em `IN_PROGRESS`; define responsável nulo e status `OPEN` na mesma transação.

### Atualizar

```json
{
  "status": "RESOLVED",
  "priority": "HIGH"
}
```

Ao menos um campo é obrigatório.

- qualquer agente pode mudar prioridade;
- apenas responsável faz `IN_PROGRESS → RESOLVED`;
- responsável ou solicitante proprietário faz `RESOLVED → IN_PROGRESS`;
- nenhuma outra transição é aceita por `PATCH`;
- todos os campos são autorizados antes de qualquer comparação ou mutação;
- reenviar o valor atual é no-op idempotente, não uma transição: retorna `200`, mas não altera `updated_at`.

O corpo inteiro é atômico: campo inválido ou não autorizado rejeita a requisição sem aplicar o outro campo.

### Comentar

```json
{ "body": "Testei outra tomada e o problema continua." }
```

O comentário criado aparece na lista `comments` do `TicketDetail` devolvido. Comentário e atualização de `ticket.updated_at` fazem parte da mesma transação. Comentários são ordenados por `created_at ASC, id ASC` no detalhe.

Toda mutação efetiva de claim, release, status, prioridade ou comentário atualiza `ticket.updated_at` na mesma transação. No-op não altera a data.

## Autorização

- Solicitante acessa somente chamado próprio.
- Chamado alheio para solicitante responde `404 TICKET_NOT_FOUND`.
- Agente lê todos os chamados.
- Permissões de mutação seguem `01-produto.md` e são verificadas no backend.
- A UI nunca é considerada barreira de autorização.

## Erros

Formato compacto e estável:

```json
{
  "detail": {
    "code": "INVALID_STATUS_TRANSITION",
    "message": "Não é possível realizar esta transição.",
    "fields": {}
  }
}
```

`fields` é sempre um objeto JSON que mapeia nome do campo para no máximo uma mensagem pública; sem erros de campo, é `{}`.

| HTTP | Código | Uso |
|---:|---|---|
| 401 | `INVALID_CREDENTIALS` | Login inválido. |
| 401 | `AUTHENTICATION_REQUIRED` | Sessão ausente/expirada. |
| 403 | `FORBIDDEN` | Papel ou agente sem permissão. |
| 403 | `ORIGIN_NOT_ALLOWED` | Origem inválida em mutação. |
| 404 | `TICKET_NOT_FOUND` | Inexistente ou invisível. |
| 409 | `TICKET_ALREADY_CLAIMED` | Concorrência ao assumir. |
| 409 | `INVALID_STATUS_TRANSITION` | Transição não permitida. |
| 422 | `VALIDATION_ERROR` | Campo/parâmetro inválido; `fields` identifica o campo. |
| 500 | `INTERNAL_ERROR` | Falha inesperada sem detalhe técnico. |

Stack trace, SQL, hash, cookie e caminho do SQLite nunca aparecem na resposta.

## SQLite e transações

- Aplicar os PRAGMAs de `02-arquitetura.md` em toda conexão aplicável.
- Usar queries parametrizadas/ORM.
- Assumir, liberar, atualizar e comentar são transacionais.
- Nenhuma transação de escrita inclui hashing, rede ou espera externa.
- Teste deve comprovar `PRAGMA foreign_keys = ON`.

## Administração mínima

Fornecer `uv run python -m app.create_user --display-name <nome> --email <email> --role <REQUESTER|AGENT>`. A senha, entre 12 e 128 caracteres, é lida duas vezes por prompt oculto ou stdin seguro; nunca por argumento. Se o e-mail já existir, o comando não altera dados, informa isso e termina com sucesso. Entrada inválida termina com código diferente de zero. Não incluir credencial padrão ou senha real em arquivo versionado.

## Documentação

- OpenAPI fica disponível em desenvolvimento/teste e desabilitado em produção.

## Critérios de contrato

- **API-AC-001:** todos os endpoints têm testes de sucesso, autenticação/autorização e principal erro de domínio.
- **API-AC-002:** solicitante não consegue inferir chamado alheio.
- **API-AC-003:** limites e campos desconhecidos retornam `422` com campo identificável.
- **API-AC-004:** dois claims concorrentes nunca persistem responsáveis diferentes.
- **API-AC-005:** falha antes do commit não deixa estado parcial.
- **API-AC-006:** paginação, busca, filtro e ordenação possuem teste com mais de uma página.
- **API-AC-007:** OpenAPI não expõe hashes, sessão bruta ou modelos ORM.
