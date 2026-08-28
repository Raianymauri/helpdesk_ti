# Spec 06 — Git e pull requests

## Repositório

- Origem oficial: `https://github.com/Raianymauri/helpdesk_ti.git`.
- Branch base atual: `main`.
- A IA deve confirmar remoto e branch default antes de alterar.
- Nunca apagar ou sobrescrever conteúdo existente sem relação com a tarefa.

## Branches

Toda branch criada pela IA deve corresponder a:

```text
feat/<slug-em-kebab-case>
fix/<slug-em-kebab-case>
```

- `feat/`: nova capacidade, documentação, configuração ou melhoria planejada.
- `fix/`: defeito ou regressão.
- Bootstrap inicial: `feat/initial-helpdesk-mvp`.

Uma branch contém uma única alteração lógica. Nunca trabalhar nem fazer push direto em `main`. Não usar force-push, `reset --hard` ou reescrita de histórico público.

## Preflight obrigatório

Antes de editar:

1. resolver a raiz com `git rev-parse --show-toplevel`;
2. confirmar que o `origin` normalizado pertence a `Raianymauri/helpdesk_ti`;
3. buscar referências remotas sem alterar arquivos;
4. verificar autenticação do GitHub CLI;
5. partir da `main` atualizada sem descartar trabalho do usuário;
6. criar ou reutilizar a branch correta.

Se houver mudança local conflitante, parar e informar. Falta de autenticação não impede implementação/testes locais, mas impede declarar publicação concluída.

Se GitHub CLI não estiver disponível, uma integração autenticada equivalente pode criar/verificar a PR. A entrega ainda exige URL e checks reais.

## Commits

- Pequenos, coesos e compiláveis quando possível.
- Mensagem curta no padrão Conventional Commits.
- Tipos principais: `feat:`, `fix:`, `test:`, `docs:`, `refactor:` e `chore:`.
- Não misturar formatação global, upgrade ou refatoração alheia.
- O primeiro MVP deve versionar código, testes, README, CI, `PROMPT_MESTRE.md`, `CLAUDE.md`, `specs/` e template de PR.

## Pull request obrigatória

Toda alteração enviada ao remoto deve possuir uma PR para `main`. Se já existir PR aberta para a mesma branch, atualize-a em vez de criar duplicata. Não faça merge salvo pedido explícito.

Título inicial:

```text
feat: build initial helpdesk MVP
```

Corpo curto:

```md
## Resumo
- [uma a três mudanças observáveis]

## Validação
- `[comando]` — passou

## Referência
- `specs/...`
```

Evitar introdução genérica, tutorial, diário de implementação, lista de arquivos, justificativas óbvias e checklist gigante. Screenshot só é necessário quando ajuda a revisar uma mudança visual.

## Publicação do MVP inicial

Após todos os gates:

1. revisar `git diff` e arquivos não rastreados;
2. confirmar que banco, segredo, cache e build não estão versionados;
3. commitar alterações coerentes;
4. enviar `feat/initial-helpdesk-mvp` ao `origin`;
5. criar ou atualizar a PR para `main` de forma não interativa;
6. confirmar URL e arquivos publicados com `gh pr diff --name-only`;
7. aguardar checks obrigatórios com `gh pr checks --watch` e corrigir qualquer falha;
8. confirmar árvore limpa e checks verdes;
9. não fazer merge.

Formato aceito pelo GitHub CLI:

```bash
gh pr create --base main --head feat/initial-helpdesk-mvp --title "feat: build initial helpdesk MVP" --body-file <arquivo-temporario>
```

O arquivo temporário do corpo não deve ser commitado.

## Condição terminal

Quando a tarefa autorizar publicação, código somente local não é entrega concluída. A resposta final informa fatos verificados:

- branch;
- commits;
- gates executados;
- URL da PR;
- checks obrigatórios da PR;
- bloqueio real, se autenticação/permissão impedir push ou PR.

Nunca inventar URL, commit, teste ou status de CI.
