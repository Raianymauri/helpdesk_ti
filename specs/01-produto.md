# Spec 01 — Produto e domínio do MVP

## Objetivo

Criar um helpdesk interno pequeno e utilizável. Solicitantes registram e acompanham problemas; agentes veem a fila, assumem chamados, respondem e resolvem.

A sofisticação do MVP está na correção, segurança, clareza, acessibilidade e testes — não na quantidade de funcionalidades.

## Atores

### Solicitante (`REQUESTER`)

- cria a própria conta por autocadastro (sempre como `REQUESTER`);
- autentica-se;
- cria chamado;
- lista e consulta somente os próprios chamados;
- comenta nos próprios chamados;
- reabre um chamado próprio resolvido.

### Agente (`AGENT`)

- autentica-se;
- lista e consulta todos os chamados;
- pesquisa e filtra a fila;
- assume ou libera um chamado;
- altera prioridade;
- resolve ou reabre o chamado que assumiu;
- comenta em qualquer chamado.

Solicitantes se autocadastram pela UI (`/register`); a conta criada é sempre `REQUESTER`. Contas `AGENT` continuam criadas apenas por comando administrativo — não existe seleção de papel nem gestão de usuários na interface.

## Escopo exato

Incluído:

- autocadastro de solicitante, login e logout;
- lista paginada com busca por número/título e filtro de status;
- criação e detalhe de chamado;
- prioridade `LOW`, `MEDIUM` ou `HIGH`;
- agente assumir/liberar chamado;
- estados `OPEN`, `IN_PROGRESS` e `RESOLVED`;
- comentários públicos;
- interface pt-BR, responsiva e acessível;
- testes automatizados de backend e frontend;
- CI no GitHub.

Fora do MVP:

- dashboard, relatórios e métricas;
- anexos, notificações, e-mail e tempo real;
- SLA, categorias, notas internas e respostas prontas;
- edição ou exclusão de chamado/comentário;
- atribuição de um chamado a outro agente;
- pesquisa avançada e ações em lote;
- autocadastro de agente, recuperação de senha ou gestão de usuários na UI;
- integrações externas, deploy e serviços cloud;
- outro banco além de SQLite;
- Redis, cache, filas, workers e microsserviços;
- design system externo ou biblioteca de componentes de terceiros.

Itens fora do escopo não devem gerar código, tabela, configuração, botão desabilitado ou `TODO` preventivo.

## Entidades

### Usuário

- `id`: inteiro;
- `display_name`: 2–100 caracteres;
- `email`: único e normalizado;
- `password_hash`;
- `role`: `REQUESTER | AGENT`;
- data de criação.

### Sessão

- token opaco armazenado apenas como hash;
- usuário;
- criação e expiração absoluta.

### Chamado

- `id`: inteiro, exibido como `#<id>`;
- `title`: 5–160 caracteres;
- `description`: 10–5.000 caracteres;
- `status`: `OPEN | IN_PROGRESS | RESOLVED`;
- `priority`: `LOW | MEDIUM | HIGH`, default `MEDIUM`;
- solicitante;
- agente responsável opcional;
- datas de criação e atualização.

### Comentário

- `id`: inteiro;
- chamado;
- autor;
- `body`: 1–2.000 caracteres;
- data de criação.

## Fluxo de estado

| Origem | Destino | Ação | Quem |
|---|---|---|---|
| — | `OPEN` | Criar | Solicitante |
| `OPEN` | `IN_PROGRESS` | Assumir | Agente, se não houver responsável |
| `IN_PROGRESS` | `OPEN` | Liberar | Agente responsável |
| `IN_PROGRESS` | `RESOLVED` | Resolver | Agente responsável |
| `RESOLVED` | `IN_PROGRESS` | Reabrir | Agente responsável ou solicitante proprietário |

Qualquer transição ausente é inválida. O backend é a fonte de verdade.

## Regras de domínio

- **DOM-001:** chamado nasce `OPEN`, sem responsável e com prioridade `MEDIUM` quando omitida.
- **DOM-002:** solicitante acessa somente chamados próprios; tentativa sobre chamado alheio responde como inexistente.
- **DOM-003:** título e descrição são imutáveis após a criação.
- **DOM-004:** agente assume apenas chamado `OPEN` e sem responsável; assumir define o próprio agente e muda para `IN_PROGRESS` atomicamente.
- **DOM-005:** agente não pode atribuir chamado a outra pessoa.
- **DOM-006:** somente o responsável libera ou resolve o chamado.
- **DOM-007:** liberar remove o responsável e retorna para `OPEN` atomicamente.
- **DOM-008:** solicitante proprietário pode reabrir seu chamado resolvido; o responsável permanece.
- **DOM-009:** qualquer agente pode alterar prioridade.
- **DOM-010:** solicitante define prioridade apenas na criação.
- **DOM-011:** usuário autorizado pode comentar em qualquer estado; comentário atualiza `updated_at`.
- **DOM-012:** chamados e comentários não são editados nem excluídos.
- **DOM-013:** conteúdo é texto simples e nunca é interpretado como HTML.
- **DOM-014:** toda mutação efetiva de claim, release, status, prioridade ou comentário atualiza `updated_at`; no-op não altera a data.
- **DOM-015:** datas e permissões são definidas pelo servidor.

## Critérios de aceitação

- **PROD-AC-001:** login válido cria sessão; senha incorreta e usuário inexistente retornam mensagem pública idêntica.
- **PROD-AC-002:** criar chamado sem prioridade resulta em `OPEN`, `MEDIUM`, sem responsável e ID numérico.
- **PROD-AC-003:** solicitante nunca lista ou acessa chamado de outra pessoa.
- **PROD-AC-004:** agente pesquisa por ID/título, filtra por status e pagina a fila.
- **PROD-AC-005:** dois agentes tentando assumir o mesmo chamado não conseguem ambos; um recebe conflito.
- **PROD-AC-006:** somente o agente responsável libera ou resolve.
- **PROD-AC-007:** solicitante proprietário e agente responsável conseguem reabrir `RESOLVED`.
- **PROD-AC-008:** comentário vazio ou acima do limite é rejeitado e não altera o chamado.
- **PROD-AC-009:** falha em uma mutação não deixa estado parcial no SQLite.
- **PROD-AC-010:** a UI trata carregamento, vazio, erro e sucesso e impede envio duplicado.
- **PROD-AC-011:** login, criação, listagem, detalhe, comentário e mudança de estado funcionam por teclado e em 320 CSS px.
- **PROD-AC-012:** todos os gates de `05-qualidade-testes.md` passam no CI.
