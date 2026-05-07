# Plano de Correções do Sistema

Dividido em 3 frentes independentes que podem ser implementadas em sequência. Cada frente entrega valor sozinha.

---

## Frente 1 — Persistência de fluxo e cache (Aluno + Personal)

**Objetivo:** o usuário sempre volta exatamente de onde parou, mesmo após trocar aba, navegar, recarregar ou suspender o app no celular.

### O que será feito
- **Camada única de persistência** baseada em `localStorage` + `sessionStorage` com um hook `usePersistedState(key, value)` reutilizável.
- **Treino em andamento (aluno):**
  - Persistir `treinoId`, `exercicios concluídos`, `pesos executados`, `timer`, `bloco atual` em `localStorage` por aluno.
  - Restaurar automaticamente ao reabrir a página `/aluno/treino/...`.
  - Sobreviver ao `visibilitychange` (já temos rehidratação de sessão; estender para o estado do treino).
- **Montagem de treino (personal):**
  - Rascunho automático (auto-save a cada mudança, debounce 500ms) por `treinoId` em `localStorage`.
  - Banner "Você tem alterações não salvas" ao reabrir.
  - Confirmação antes de descartar (`beforeunload` + dialog interno em navegação SPA).
- **Modais e abas:**
  - Sincronizar tab ativa via query param (`?tab=`) — já é padrão; aplicar onde ainda usa estado local.
  - Modais críticos (montagem, edição) viram rotas (`/aluno/:id?modal=editar-treino`) para sobreviver a refresh.
  - Modais não-críticos persistem `open` em `sessionStorage`.
- **Cache de queries:** revisar `staleTime` e `gcTime` do React Query para fluxos frequentes (treinos, exercícios, perfil) — manter por 5–10 min.

### Entregáveis
- `src/hooks/usePersistedState.ts`
- `src/hooks/useWorkoutDraft.ts` (montagem do personal)
- `src/hooks/useWorkoutSession.ts` (estendido para persistir tudo do treino do aluno)
- Ajustes em `WorkoutDayView`, `TreinosManager`, `ExercicioDialog`, `WorkoutBlockDialog`.

---

## Frente 2 — Notificações e feedbacks

**Objetivo:** central de notificações sempre leva à ação certa, com nome do aluno correto e abre o modal/chat apropriado.

### O que será feito
- **Padronizar payload** em `notificacoes.dados`:
  ```json
  { "aluno_id": "...", "aluno_nome": "...", "tipo_acao": "feedback|chat|treino|checkin", "ref_id": "..." }
  ```
- **Resolver nome do aluno na origem:** ao criar a notificação (no trigger ou na função que insere), buscar `profiles.nome` em vez de confiar em snapshot antigo.
- **Roteamento correto no `NotificacoesDropdown`:**
  - `feedback` → abre `FeedbackDetailModal` direto com o `ref_id`.
  - `chat` → navega para `/aluno/:id?tab=chat` e abre o `ChatPanel`.
  - `treino` / `checkin` → rota correspondente com tab pré-selecionada.
- **Marcar como lida** ao abrir a ação (não apenas ao clicar no item).
- **Sincronização:** subscription realtime já existe; garantir invalidação do React Query ao receber evento.
- **Backfill:** script único para corrigir notificações antigas com `aluno_nome` ausente/errado (insert tool).

### Entregáveis
- Ajuste em `src/components/NotificacoesDropdown.tsx` (roteamento + marcar lida).
- Ajuste em `src/hooks/useNotificacoes.ts` (resolver nome no insert).
- Função SQL `criar_notificacao(...)` que padroniza payload (opcional, recomendado).
- Pequenas mudanças em `FeedbackDetailModal` e `ChatPanel` para aceitar abrir via prop/URL.

---

## Frente 3 — Montagem de treino (estabilidade)

**Objetivo:** montagem fluida, ordenação correta, drag-and-drop completo, sem perda de dados ou edições incorretas.

### O que será feito
- **Ordenação:**
  - Garantir que toda inserção use o padrão de múltiplos de 10 (já documentado em memória).
  - Função SQL `reordenar_exercicios` análoga a `reordenar_blocos` para evitar conflitos de ordem.
- **Circuitos/conjugados:**
  - Corrigir `criar_grupo_exercicios` para validar `ordem_no_grupo` sequencial e `tipo_agrupamento` válido.
  - Modal único "Adicionar exercício" já consolidado — revisar fluxo de criação de grupo a partir de exercício existente.
- **Edição renderizando dados errados:**
  - Causa típica: estado inicial do dialog não reseta entre aberturas. Forçar `key={exercicio.id}` nos dialogs para remontar ao trocar item.
  - Carregar dados frescos via React Query (`enabled: open && !!id`) em vez de reusar prop antiga.
- **Exclusão com confirmação:**
  - Adicionar `AlertDialog` em todos os botões de delete de exercícios, blocos e grupos.
- **Drag-and-drop:**
  - Estender DnD para reordenar **entre blocos** (mover exercício de um bloco para outro).
  - Feedback visual durante o drag (placeholder + ghost).
  - Persistir nova ordem com debounce para evitar muitas writes.
- **Auto-save** (vem da Frente 1) cobre perda de progresso.

### Entregáveis
- Migration: função `reordenar_exercicios`, ajustes em `criar_grupo_exercicios`.
- Ajuste em `SortableExercicioCard`, `SortableBlockCard`, `SortableGroupCard`.
- `ConfirmDeleteDialog` reutilizável.
- `key` props e refetch on open em `ExercicioDialog`, `WorkoutBlockDialog`, `ExerciseGroupDialog`.

---

## Ordem de execução sugerida

1. **Frente 3** primeiro (resolve dor imediata da montagem do personal).
2. **Frente 1** (auto-save + restauração — depende parcialmente da Frente 3 estar estável).
3. **Frente 2** (notificações — independente, pode ser feita em paralelo).

## Estimativa de escopo
- Frente 1: ~6–8 arquivos, 1 migration opcional.
- Frente 2: ~4 arquivos, 1 migration (função SQL) + 1 backfill.
- Frente 3: ~8 arquivos, 1 migration.

## Fora do escopo deste plano
- Refatoração visual da UI.
- Mudanças em autenticação, RLS ou cobrança.
- Novas features (apenas correção do que já existe).

---

Confirma a ordem (3 → 1 → 2) ou prefere outra? Posso começar pela Frente 3 assim que aprovar.