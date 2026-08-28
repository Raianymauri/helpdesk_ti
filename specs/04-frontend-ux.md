# Spec 04 — Frontend, UX e acessibilidade

## 1. Objetivo de experiência

A interface deve parecer sóbria e profissional, sem excesso visual. O usuário precisa reconhecer rapidamente onde está, qual é o estado do chamado e qual ação pode executar.

Não existe dashboard no MVP. Após o login, o produto abre diretamente a lista relevante ao papel.

## 2. Rotas e páginas

| Rota | Página | Acesso |
|---|---|---|
| `/login` | `LoginPage` | Público. |
| `/tickets` | `TicketListPage` | Autenticado. |
| `/tickets/new` | `TicketCreatePage` | Solicitante. |
| `/tickets/:ticketId` | `TicketDetailsPage` | Usuário autorizado. |

Rotas desconhecidas mostram uma página simples “Página não encontrada” com retorno para a lista. Usuário não autenticado é redirecionado para `/login`; após autenticar, sempre segue para `/tickets`.

## 3. Estrutura comum

Após autenticação:

- `header` com nome “Helpdesk TI”, nome do usuário, papel textual e botão “Sair”;
- `nav` curta com link “Chamados” e, para solicitante, “Novo chamado”;
- `main` com exatamente um `h1`;
- largura máxima de conteúdo de `72rem`, centralizada;
- feedback assíncrono próximo da ação que o originou.

Não use sidebar, menu hambúrguer, breadcrumbs, notificações globais ou modal se a navegação e mensagens inline resolverem.

## 4. Comportamento das páginas

### 4.1 Login

- Campos “E-mail” e “Senha” com labels visíveis.
- Botão “Entrar”.
- Validação de presença antes do envio.
- Durante envio, campos e botão ficam protegidos contra submissão duplicada e o botão informa “Entrando…”.
- Erro de credencial usa mensagem genérica: “E-mail ou senha inválidos.”
- Erro de conexão preserva o e-mail, limpa a senha e oferece “Tentar novamente”.
- Login concluído leva a `/tickets`.

Não incluir “Criar conta”, “Esqueci minha senha” ou login social.

### 4.2 Lista de chamados

Para solicitante, título “Meus chamados”. Para agente, “Fila de chamados”.

Elementos:

- busca por número ou título;
- filtro de status;
- botão “Novo chamado” somente para solicitante;
- lista de cards semânticos;
- paginação anterior/próxima e texto “Página X de Y”.

Cada card mostra:

- número e título como link;
- status textual;
- prioridade textual;
- solicitante, somente na fila do agente;
- responsável ou “Sem responsável”, sem filtro dedicado;
- data de atualização.

Filtros são refletidos na query string para que recarregar ou compartilhar a URL preserve a visão. Busca só dispara ao enviar o formulário ou após interação explicitamente concluída; não faça requisição a cada tecla.

Alterar busca ou status redefine `page=1`. Query params ausentes ou inválidos são normalizados para os defaults sem quebrar a tela.

Estados:

- carregando: mensagem `Carregando chamados…`;
- vazio sem filtros: orientação para criar o primeiro chamado ou informar que a fila está vazia;
- vazio com filtros: “Nenhum chamado corresponde aos filtros.” e ação “Limpar filtros”;
- erro: mensagem útil e botão “Tentar novamente”;
- conteúdo: lista e paginação.

### 4.3 Criar chamado

Campos:

- “Título”;
- “Descrição”;
- “Prioridade”, default visual `Média`.

Limites da API devem ser comunicados e validados sem substituir a validação do backend. Erros aparecem junto aos campos. Em submissão inválida, o foco vai ao primeiro campo inválido.

Durante envio, impedir duplicidade e indicar “Criando…”. Em falha, preservar todos os valores. Em sucesso, navegar para o detalhe do chamado criado e anunciar a confirmação.

Não incluir categoria, anexo, editor rich text ou campos dinâmicos.

### 4.4 Detalhe do chamado

Exibe:

- número como parte do `h1` e título;
- descrição como texto, preservando quebras de linha sem interpretar HTML;
- status, prioridade, solicitante, responsável e datas;
- ações autorizadas para assumir, liberar, resolver, reabrir e alterar prioridade;
- comentários em ordem cronológica;
- formulário de comentário em qualquer estado.

Ações inválidas não devem aparecer, mas o frontend deve tratar `403` e `409` caso o estado mude no servidor. Após mutação, use a resposta do servidor como novo estado; não suponha sucesso antecipadamente.

Falha ao comentar preserva o texto. Em `RESOLVED`, a interface mantém comentários e apresenta a ação de reabrir apenas para quem tem permissão.

## 5. Estado e comunicação HTTP

- Um `AuthProvider` pequeno PODE manter o usuário atual e as ações de login/logout.
- Estado de página permanece na feature; não usar Redux ou store externo.
- O cliente HTTP centraliza base URL, `credentials`, parsing JSON e transformação do envelope de erro.
- O cookie HttpOnly é gerenciado apenas pelo navegador e nunca é lido pelo JavaScript.
- `401 AUTHENTICATION_REQUIRED` limpa o estado local e redireciona para `/login`; logout faz o mesmo após a resposta do servidor.
- Módulos de feature expõem funções com nomes de domínio, como `createTicket` e `changeTicketStatus`.
- Componentes não montam endpoints nem comparam mensagens humanas para decidir comportamento.
- Requisição cancelada por desmontagem não atualiza estado obsoleto.
- Não duplique resposta da API em múltiplos estados; derive filtros, permissões visuais e rótulos quando possível.

## 6. Sistema visual monocromático

Somente os seguintes tokens e derivados de preto, branco e cinza são permitidos:

```css
:root {
  --color-background: #f7f7f7;
  --color-surface: #ffffff;
  --color-text: #111111;
  --color-text-muted: #5f5f5f;
  --color-border: #737373;
  --color-subtle: #e8e8e8;
  --color-primary: #000000;
  --color-on-primary: #ffffff;
  --color-focus: #000000;
}
```

Diretrizes:

- fonte nativa do sistema operacional;
- corpo mínimo `16px`, line-height `1.5`;
- texto auxiliar mínimo `14px`;
- escala de espaço `4, 8, 12, 16, 24, 32, 48px`;
- botão primário preto com texto branco;
- botão secundário branco com texto e borda pretos;
- raio discreto, no máximo `8px`;
- sem gradiente, sombra decorativa, glassmorphism ou animação ornamental;
- hierarquia por tipografia, espaço, borda e peso, não por novas cores.

Status e prioridade usam rótulo por extenso. Estilos de borda ou peso podem reforçar a diferença, mas nunca substituem o texto.

## 7. Responsividade

- Layout funcional entre 320 e 1440 CSS px sem rolagem horizontal da página.
- Use uma única lista responsiva de cards; não implemente tabela desktop e cópia em cards mobile.
- Formulários usam uma coluna em telas estreitas.
- Controles de filtro quebram linha sem cortar label ou ação.
- Conteúdo longo quebra linha; truncamento só é permitido se houver forma acessível de ler o conteúdo completo.
- Ações essenciais não dependem de hover.

## 8. Acessibilidade WCAG 2.2 AA

- **A11Y-001:** contraste mínimo de 4,5:1 para texto normal e 3:1 para texto grande e elementos visuais essenciais.
- **A11Y-002:** todos os fluxos são concluíveis por teclado em ordem de foco lógica.
- **A11Y-003:** foco visível possui ao menos 2 px e contraste perceptível; nunca use `outline: none` sem substituto.
- **A11Y-004:** controles interativos adotam alvo mínimo de 44 × 44 CSS px.
- **A11Y-005:** todo campo possui `label`; instrução e erro usam associação programática.
- **A11Y-006:** erro de formulário move foco ao primeiro campo inválido sem apagar valores.
- **A11Y-007:** mudanças assíncronas relevantes usam região de status ou `aria-live` apropriada.
- **A11Y-008:** mudança de rota atualiza `document.title` e posiciona foco no título principal.
- **A11Y-009:** `html` usa `lang="pt-BR"`; datas usam `<time datetime>` e apresentação pt-BR.
- **A11Y-010:** elementos nativos são obrigatórios; `div` ou `span` clicável é proibido.
- **A11Y-011:** ícone decorativo é oculto de tecnologia assistiva; ícone funcional tem nome acessível.
- **A11Y-012:** status, prioridade, sucesso e erro possuem texto e não dependem de cor.
- **A11Y-013:** interface mantém reflow com zoom de 200%.
- **A11Y-014:** respeitar `prefers-reduced-motion`; animação nunca transmite informação indispensável.

## 9. Conteúdo e mensagens

- Frases curtas, diretas e sem jargão técnico.
- Botão usa verbo de ação: “Criar chamado”, “Adicionar comentário”, “Marcar como resolvido”.
- Erro informa o problema e, quando recuperável, a próxima ação.
- Nunca mostre stack trace, código SQL, caminho de arquivo ou mensagem crua da exceção.
- Enums são traduzidos na UI: `OPEN → Aberto`, `IN_PROGRESS → Em andamento`, `RESOLVED → Resolvido`.
- Prioridades: `LOW → Baixa`, `MEDIUM → Média`, `HIGH → Alta`.

## 10. Critérios de aceitação

- **UX-AC-001:** cada página assíncrona possui estados de carregamento, vazio quando aplicável, erro recuperável e conteúdo.
- **UX-AC-002:** nenhum duplo clique gera duas mutações.
- **UX-AC-003:** falha de API preserva dados não sensíveis digitados e permite nova tentativa.
- **UX-AC-004:** filtros sobrevivem ao reload por meio da URL.
- **UX-AC-005:** ações exibidas correspondem ao papel e estado atual, sem substituir autorização do servidor.
- **UX-AC-006:** texto fornecido pelo usuário é exibido sem interpretação de HTML.
- **UX-AC-007:** os quatro fluxos de página funcionam em 320 CSS px e zoom 200%.
- **UX-AC-008:** login, criar, listar, abrir, comentar e mudar status podem ser executados somente por teclado.
- **UX-AC-009:** toda informação de status e prioridade permanece compreensível em escala de cinza.
- **UX-AC-010:** build de produção não inclui biblioteca visual, store global ou código de feature fora do MVP.
