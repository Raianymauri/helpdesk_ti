# Especificações do Helpdesk TI

## Finalidade

Esta pasta é a fonte de verdade do comportamento e da qualidade do produto. Toda alteração observável deve nascer de uma spec ou atualizar a spec afetada na mesma pull request.

O MVP busca um equilíbrio explícito:

- **simples:** somente os fluxos essenciais de atendimento;
- **sofisticado:** segurança, acessibilidade, contratos consistentes e testes desde o início;
- **sustentável:** estrutura curta, nomes claros e nenhuma extensibilidade especulativa.

## Ordem de leitura

1. [`01-produto.md`](01-produto.md) — problema, atores, escopo, regras e critérios de aceite.
2. [`02-arquitetura.md`](02-arquitetura.md) — stack, limites, estrutura e decisões técnicas.
3. [`03-api-backend.md`](03-api-backend.md) — dados, permissões, transições e contrato HTTP.
4. [`04-frontend-ux.md`](04-frontend-ux.md) — telas, interação, sistema visual e acessibilidade.
5. [`05-qualidade-testes.md`](05-qualidade-testes.md) — estratégia de teste, cobertura e gates.
6. [`06-fluxo-git.md`](06-fluxo-git.md) — branches, commits, publicação e pull requests.

## Força normativa

Os termos abaixo possuem significado obrigatório:

- **DEVE / NÃO DEVE:** requisito obrigatório.
- **DEVERIA / NÃO DEVERIA:** padrão esperado; desvio exige justificativa explícita na PR.
- **PODE:** opção permitida, não uma exigência.

Em caso de conflito:

1. instrução explícita mais recente do usuário;
2. `PROMPT_MESTRE.md`, especialmente no bootstrap inicial;
3. critérios de aceite da feature;
4. contrato da API e regras de domínio;
5. arquitetura e qualidade;
6. `CLAUDE.md` e implementação atual.

Um conflito não deve ser resolvido silenciosamente. A alteração precisa manter a documentação e o comportamento consistentes.

## Convenções de rastreabilidade

Requisitos usam prefixos estáveis:

- `PROD-*`: produto e escopo;
- `DOM-*`: regra de domínio;
- `ARCH-*`: arquitetura;
- `API-*`: contrato HTTP;
- `UX-*`: experiência e interface;
- `A11Y-*`: acessibilidade;
- `QA-*`: teste e qualidade;
- `GIT-*`: versionamento e pull request.

Testes e PRs devem citar o ID relevante quando isso melhorar a rastreabilidade. Não é necessário repetir IDs em cada linha de código.

## Vocabulário do domínio

| Termo pt-BR | Identificador no código | Significado |
|---|---|---|
| Solicitante | `requester` | Pessoa que cria e acompanha os próprios chamados. |
| Agente | `agent` | Pessoa de atendimento que opera a fila de chamados. |
| Chamado | `ticket` | Solicitação de suporte registrada no sistema. |
| Responsável | `assignee` | Agente atualmente atribuído ao chamado. |
| Comentário | `ticket_comment` | Mensagem pública e imutável no chamado. |
| Fila | `ticket_queue` | Listagem de chamados visível aos agentes. |

A interface usa os termos em pt-BR. Código, enums e propriedades da API usam os identificadores em inglês.

## Formato para novas feature specs

Uma nova spec deve conter apenas o necessário:

1. objetivo e valor;
2. atores e permissões;
3. escopo e fora de escopo;
4. regras de negócio e estados;
5. contrato ou dados afetados;
6. estados de carregamento, vazio e erro quando houver UI;
7. critérios de aceitação verificáveis;
8. segurança, acessibilidade e testes relevantes;
9. dúvidas abertas que realmente impeçam a implementação.

Critérios devem ser observáveis e, quando útil, escritos em Dado/Quando/Então. Não use expressões vagas como “funcionar bem”, “ser intuitivo” ou “ter boa performance” sem uma medida ou exemplo verificável.

## Controle de escopo

Uma ideia não entra no MVP por parecer comum em outros helpdesks. Ela precisa estar nesta documentação e atender a uma necessidade atual.

Itens fora do escopo ficam registrados em `01-produto.md` para evitar implementação acidental. Quando um deles for aprovado no futuro, deve receber spec própria antes do código.

## Referências técnicas atuais

As decisões iniciais foram conferidas em documentação oficial em 27 de agosto de 2026:

- [React — documentação oficial](https://react.dev/): componentes puros, estado mínimo e Effects para sincronização externa.
- [FastAPI — aplicações maiores](https://fastapi.tiangolo.com/tutorial/bigger-applications/): organização por routers e múltiplos arquivos.
- [FastAPI — testes](https://fastapi.tiangolo.com/tutorial/testing/): testes de endpoints com `TestClient`.
- [Vite — guia](https://vite.dev/guide/): ambiente de desenvolvimento e build de produção.
- [Node.js — releases](https://nodejs.org/en/about/previous-releases): Node 24 como linha LTS no baseline atual.
- [uv — projetos e lockfile](https://docs.astral.sh/uv/concepts/projects/layout/): ambiente Python reproduzível com `uv.lock` versionado.
- [SQLite — isolamento](https://www.sqlite.org/isolation.html): transações serializáveis e apenas um escritor por vez.
- [SQLite — WAL](https://www.sqlite.org/wal.html): leitores durante escrita, arquivos auxiliares e restrição a filesystem local.
- [SQLite — foreign keys](https://www.sqlite.org/foreignkeys.html): habilitação explícita em cada conexão.

Antes de implementar APIs específicas, consulte novamente a documentação atual e o lockfile do projeto.
