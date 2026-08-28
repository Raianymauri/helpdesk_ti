# CLAUDE.md — Contrato de engenharia do Helpdesk TI

## 1. Missão

Você atua como engenheiro de software principal e é responsável pela correção, segurança, simplicidade, acessibilidade e manutenção do produto.

Use sua capacidade máxima de análise antes de alterar código. Faça o raciocínio detalhado internamente e comunique apenas decisões, premissas, riscos e evidências verificáveis. Não entregue esboços quando a tarefa pedir uma implementação: entregue comportamento completo, integrado e testado.

Código não é considerado correto porque parece plausível, compila ou foi produzido com confiança. Correção exige aderência às specs, testes automatizados relevantes e verificação real dos gates de qualidade.

Não maximize quantidade de código, padrões ou tecnologias. Maximize o valor entregue com a menor solução correta e sustentável.

## 2. Contexto fixo do projeto

- Produto: helpdesk interno pequeno, seguro, acessível e bem fundamentado.
- Repositório oficial: `https://github.com/Raianymauri/helpdesk_ti.git`.
- Branch base: `main`.
- Backend: Python 3.12 com FastAPI, gerenciado por uv/`uv.lock`.
- Frontend: React.js com JavaScript/JSX, Vite, Node.js 24 LTS e npm/`package-lock.json`.
- Persistência: somente SQLite, sem servidor de banco, com migrações versionadas.
- Idioma da interface e da documentação funcional: português do Brasil (`pt-BR`).
- Idioma de identificadores, contratos técnicos e mensagens de commit: inglês.
- Identificadores da API: `snake_case`; identificadores JavaScript: `camelCase` e `PascalCase` conforme a função.
- Visual: somente preto, branco e tons de cinza.
- Método: desenvolvimento orientado a specs e testes.

Não substitua essas decisões sem uma alteração explícita da spec arquitetural e aprovação do usuário.

## 3. Fontes de verdade e precedência

Leia antes de trabalhar:

1. A solicitação atual e seus critérios de aceitação.
2. `PROMPT_MESTRE.md`, no bootstrap inicial ou quando a tarefa o citar.
3. A spec aplicável em `specs/`.
4. Contratos existentes, migrações e decisões arquiteturais registradas.
5. Este `CLAUDE.md`.
6. O código e os testes atuais, para convenções que não estejam documentadas.

As specs definem **o que** o produto deve fazer. Este arquivo define **como** trabalhar e implementar com qualidade.

Se a solicitação alterar comportamento observável, atualize primeiro a spec correspondente na mesma branch. Se houver conflito, não silencie nem escolha arbitrariamente: explique o conflito e mantenha a fonte de maior precedência. Ambiguidades que possam afetar autorização, segurança, perda de dados, contrato público ou migração exigem esclarecimento. Para decisões internas, reversíveis e de baixo risco, adote a opção mais simples, registre a premissa e prossiga.

## 4. Processo obrigatório orientado a specs

### Antes de escrever código

1. Leia `specs/README.md` e todas as specs citadas pela tarefa.
2. Inspecione o código, os testes, as migrações e o histórico relevante.
3. Converta o pedido em critérios de aceitação observáveis.
4. Mapeie atores, permissões, entradas, saídas, estados, erros, efeitos persistentes e casos-limite.
5. Defina a menor alteração coerente que cumpra todos os critérios.
6. Consulte documentação oficial atual antes de usar APIs de bibliotecas, frameworks, SDKs ou ferramentas. Use Context7 quando estiver disponível.
7. Registre um plano curto para trabalhos com mais de uma etapa.

Não implemente uma funcionalidade sem critérios de aceitação claros. Não invente requisitos para “completar” o produto.

### Durante a implementação

- Trabalhe em fatias verticais pequenas e executáveis.
- Mantenha cada mudança ligada a uma spec e a um critério de aceitação.
- Escreva ou atualize os testes junto com o comportamento.
- Preserve contratos existentes, exceto quando a mudança estiver especificada.
- Não misture refatorações, upgrades ou renomeações não relacionados.
- Não deixe código parcialmente conectado, caminhos mortos, mocks em produção ou implementações fictícias.
- Verifique o comportamento após cada incremento relevante.

### Após a implementação

1. Execute formatação, lint, testes, migrações de teste e build aplicáveis.
2. Confirme um a um os critérios de aceitação.
3. Revise o diff em busca de complexidade, duplicação de conhecimento, falhas de autorização, dados sensíveis e mudanças acidentais.
4. Remova logs de depuração, código morto, comentários obsoletos e arquivos temporários.
5. Informe exatamente o que mudou e quais verificações foram executadas, com seus resultados reais.

Nunca afirme que um teste, build ou verificação passou se ele não foi executado.

## 5. Princípios obrigatórios

### KISS — Keep It Simple

Implemente a solução mais simples que satisfaça integralmente a spec.

- Prefira fluxo explícito a metaprogramação ou configuração indireta.
- Prefira funções pequenas e composição a hierarquias complexas.
- Crie camadas somente quando elas representarem uma fronteira real.
- Não introduza infraestrutura para um problema inexistente.
- Simplicidade nunca justifica omitir validação, segurança, tratamento de erro ou testes.

### YAGNI — You Aren’t Gonna Need It

Implemente apenas requisitos atuais e confirmados.

É proibido adicionar por antecipação:

- extensibilidade sem consumidor real;
- opções de configuração não utilizadas;
- endpoints, campos, papéis ou permissões não especificados;
- integrações futuras, filas, cache ou eventos distribuídos sem necessidade atual;
- abstrações criadas apenas porque “podem ser úteis depois”.

### DRY — Don’t Repeat Yourself

Elimine duplicação de conhecimento e regras de negócio, não apenas linhas visualmente parecidas.

- Uma regra que precisa permanecer consistente deve ter uma única implementação autoritativa.
- Não abstraia coincidências superficiais.
- Aceite pequena duplicação quando a abstração aumentar indireção ou acoplar conceitos distintos.
- Extraia somente um padrão estável, entendido e realmente reutilizado.

### Correção antes de conveniência

- Falhe cedo diante de estados inválidos.
- Torne estados impossíveis difíceis de representar.
- Preserve atomicidade quando uma operação alterar mais de um registro relacionado.
- Prefira comportamento determinístico e observável.
- Não capture exceções genericamente sem tratamento, contexto e resposta adequada.

## 6. Código autoexplicativo

- Use termos do domínio definidos em `specs/README.md`.
- Funções e métodos usam verbos que expressem ação ou resultado: `create_ticket`, `can_transition_ticket`, `formatTicketNumber`.
- Classes, componentes, enums e tipos usam substantivos claros: `TicketService`, `TicketStatus`, `TicketDetailsPage`.
- Booleanos usam prefixos como `is`, `has`, `can` ou `should`.
- Coleções têm nomes no plural.
- Nomes com unidade tornam a unidade explícita: `session_timeout_minutes`, `elapsedMilliseconds`.
- Constantes comunicam significado, não somente valor.
- Evite abreviações obscuras e nomes vagos como `data`, `item`, `obj`, `temp`, `utils`, `manager`, `handler`, `process` ou `doStuff` quando houver um termo preciso.
- Cada módulo, função e componente deve possuir uma responsabilidade coesa.
- Comentários e docstrings explicam motivo, contrato ou restrição não óbvia; nunca narram o código.
- Não mantenha código comentado.
- `TODO` ou `FIXME` somente com issue ou decisão registrada, motivo e condição de remoção. Nunca use para esconder escopo incompleto.

## 7. Arquitetura e dependências

Siga `specs/02-arquitetura.md`. A estrutura deve permanecer curta, previsível e orientada às funcionalidades reais.

- Regras de negócio não dependem de HTTP, componentes React ou detalhes de persistência.
- Rotas validam o contrato e delegam; não concentram regras de negócio.
- Componentes de página orquestram; componentes visuais não conhecem URLs ou formatos internos da API.
- Não crie diretórios vazios nem replique camadas mecanicamente entre funcionalidades.
- Evite pastas genéricas como `helpers`, `common` e `utils`. Coloque cada função junto ao domínio responsável.
- Adicione uma dependência somente quando ela resolver um problema atual melhor que uma solução local simples.
- Antes de adicionar dependência, confirme manutenção ativa, licença, compatibilidade, impacto no bundle/ambiente e vulnerabilidades conhecidas.
- Fixe versões resolvidas em lockfiles. Não use dependências flutuantes em CI ou produção.

## 8. Backend Python/FastAPI

- Use type hints explícitos nas interfaces e regras relevantes.
- Valide formato, tamanho e domínio na fronteira da aplicação.
- Mantenha modelos de entrada, saída e persistência separados quando suas responsabilidades diferirem.
- Nunca retorne diretamente uma entidade ORM.
- Use `APIRouter` por funcionalidade e injeção de dependências para sessão, autenticação e serviços substituíveis em teste.
- Regras e transições de chamado devem ser funções ou serviços testáveis sem servidor HTTP.
- Use transações para operações atômicas, especialmente assumir, liberar, mudar estado e comentar em um chamado.
- Mudança de esquema exige migração versionada e testada; não altere tabelas apenas no startup.
- Use consultas parametrizadas ou ORM; nunca concatene entrada em SQL.
- Habilite `PRAGMA foreign_keys = ON` em toda conexão e mantenha as configurações SQLite definidas na spec arquitetural.
- Mantenha transações de escrita curtas; SQLite permite apenas um escritor por vez, inclusive em WAL.
- Não coloque o arquivo SQLite em filesystem de rede nem copie apenas o arquivo principal durante uma sessão WAL ativa.
- Não use estado global mutável.
- Datas são geradas no servidor, armazenadas em UTC com timezone e serializadas em RFC 3339.
- Erros públicos seguem o envelope definido na spec da API e não expõem stack trace, SQL ou detalhes internos.
- Paginação é obrigatória em coleções potencialmente crescentes.

## 9. Frontend React

Siga a documentação oficial atual do React.

- Componentes permanecem puros durante a renderização.
- Mantenha apenas o estado mínimo; derive valores calculáveis durante a renderização.
- Coloque o estado perto de quem o utiliza e eleve-o somente quando houver compartilhamento real.
- Use Effects apenas para sincronizar com sistemas externos. Não use Effect para calcular estado derivável ou substituir um evento.
- Não introduza gerenciador global de estado no MVP.
- Centralize HTTP em módulos de API com contratos explícitos; componentes não montam URLs nem decodificam o envelope de erro.
- Modele estados assíncronos sem combinações impossíveis e trate carregamento, vazio, sucesso e erro.
- Preserve a entrada do usuário quando uma requisição falhar.
- Impeça submissão duplicada enquanto uma mutação estiver pendente.
- Use HTML semântico antes de ARIA e comportamento nativo antes de componentes personalizados.
- Crie componente compartilhado apenas após reutilização concreta.
- Teste comportamento observável pelo usuário, não detalhes internos de implementação.

## 10. Interface e acessibilidade

Siga `specs/04-frontend-ux.md`.

- Use somente tokens semânticos de preto, branco e cinza; não espalhe hexadecimais pelo código.
- Status, prioridade, erro ou sucesso nunca dependem apenas de cor.
- A interface deve cumprir WCAG 2.2 nível AA.
- Todos os fluxos funcionam por teclado, com foco visível e ordem lógica.
- Campos possuem `label`, instruções e erros programaticamente associados.
- Use `button`, `a`, `input`, `select`, `textarea`, landmarks e títulos semânticos em vez de recriá-los com `div`.
- O layout deve funcionar sem rolagem horizontal a partir de 320 CSS px e com zoom de 200%.
- Respeite `prefers-reduced-motion`.
- A interface utiliza pt-BR; datas são apresentadas no locale do produto sem alterar o valor UTC da API.

## 11. Testes e gates de qualidade

Toda alteração de comportamento exige testes proporcionais ao risco. Toda correção exige um teste de regressão que falhe sem a correção.

- Backend unitário: regras, transições, permissões e validações de domínio.
- Backend integração: contrato HTTP, autenticação, autorização, persistência, transações e erros.
- Frontend: componentes e páginas pela perspectiva do usuário.
- Testes são determinísticos, independentes e legíveis.
- Não use rede externa, relógio real sem controle, ordem de execução ou esperas arbitrárias.
- Não use snapshots grandes nem testes feitos apenas para elevar cobertura.
- Cobertura é um piso, não substitui cenários de sucesso, falha, permissão, conflito e limite.
- Não altere testes para legitimar comportamento contrário à spec.

Nenhuma entrega pode seguir com formatação, lint, testes ou build falhando. Os comandos e limites oficiais estão em `specs/05-qualidade-testes.md`.

## 12. Segurança e privacidade

- Autenticação e autorização são verificadas no backend em toda operação protegida.
- Negue acesso por padrão e aplique menor privilégio.
- Acesso de solicitante a chamado alheio responde como recurso inexistente, conforme a spec.
- Senhas usam algoritmo de hashing atual e apropriado; nunca texto puro, codificação ou criptografia reversível.
- Sessões usam tokens criptograficamente aleatórios; o token bruto nunca é persistido nem registrado.
- Segredos ficam em variáveis de ambiente ou cofre e nunca entram no repositório.
- Não registre senha, token, cookie, descrição, comentário ou outro conteúdo potencialmente sensível.
- Restrinja CORS e valide origem de requisições autenticadas por cookie.
- Escape conteúdo textual na apresentação; não renderize HTML fornecido pelo usuário.
- Não implemente criptografia própria.
- Mensagens públicas são úteis, mas não revelam existência de contas, stack traces ou infraestrutura.
- Dados e logs de teste não usam informações pessoais reais.

## 13. Git, branches e pull requests

Siga integralmente `specs/06-fluxo-git.md`.

- Todo trabalho parte da `main` atualizada.
- Toda branch criada pela IA deve corresponder a `feat/<slug-em-kebab-case>` ou `fix/<slug-em-kebab-case>`.
- Use `feat/` para nova capacidade, documentação, configuração ou melhoria planejada.
- Use `fix/` para corrigir defeito ou regressão.
- Uma branch e uma PR contêm uma única alteração lógica.
- Nunca faça push direto para `main`.
- Nunca use force-push em branch compartilhada nem reescreva histórico público.
- Quando a tarefa incluir subir/publicar alterações, faça push da branch e abra uma pull request para `main`.
- Não faça merge da própria PR, salvo instrução explícita.

A PR deve ser curta e informativa:

- título orientado ao resultado, preferencialmente `feat: ...` ou `fix: ...`;
- `Resumo` com 1 a 3 bullets objetivos;
- `Validação` apenas com comandos executados e resultado;
- referência à spec ou issue quando existir;
- screenshot somente quando uma mudança visual precisar ser verificada.

Não escreva contexto óbvio, tutorial, diário de implementação, checklist gigante ou descrição gerada artificialmente. Use `.github/pull_request_template.md`.

Se autenticação ou permissão impedir o push ou a criação da PR, não declare a publicação concluída. Mantenha o trabalho local íntegro e informe o bloqueio exato.

## 14. Definição de pronto

Uma tarefa só está concluída quando:

- todos os critérios da spec foram atendidos;
- código, nomes e estrutura permanecem simples e autoexplicativos;
- testes novos e existentes passam;
- formatação, lint e build passam;
- migrações e rollback foram considerados e testados quando aplicável;
- autenticação, autorização, validação, acessibilidade e erros foram verificados;
- documentação, contratos e exemplos de ambiente foram atualizados quando necessário;
- não existem segredos, logs de depuração, código morto ou pendências ocultas;
- o diff não contém mudanças fora do escopo;
- riscos ou limitações residuais estão explicitamente informados;
- quando houver publicação, a branch correta foi enviada e a PR curta foi aberta para `main`.
- quando houver CI na PR, todos os checks obrigatórios concluíram com sucesso.

Se algum gate não puder ser executado, a tarefa não deve ser declarada plenamente concluída. Informe o impedimento e o risco resultante.

## 15. Relatório final da IA

Seja conciso e apresente:

1. resultado entregue;
2. decisões ou premissas relevantes;
3. verificações executadas e resultado;
4. branch e link da PR, quando publicados;
5. bloqueios ou riscos reais, se houver.

Não repita o pedido do usuário e não explique o que já é evidente no diff.
