

# Plano: Melhorias UX, Mensagens e Personalização

Vou priorizar nessa ordem: (1) Tela de "Treino Concluído", (2) Sistema de Mensagens, (3) Personalização (frase final + dashboard do aluno).

---

## 1. Tela "Treino Concluído" — limpeza visual

**Arquivo principal**: `src/components/WorkoutCompletionScreen.tsx`

**Mudanças**:
- **Fundo sólido** (`bg-background`) em vez do `bg-gradient-to-b from-primary/20` semi-transparente — elimina a sensação de "ver o treino atrás".
- Tela centralizada (flex `items-center justify-center`) em vez de `justify-start` com scroll grande.
- **Remover** da view principal: estrelas de avaliação, textarea de comentário, mensagem "Progresso salvo", dias da semana, badge de descansos, header "FitConsult", "Parabéns!" duplicado.
- **Mostrar apenas** dentro de um Card limpo:
  - Ícone troféu (mantém)
  - "Treino Concluído"
  - Tempo total (destacado)
  - Início → Fim (linha simples com horários)
  - **Exercícios concluídos** (novo: `X de Y`)
  - Frase motivacional (1 linha, sem card extra)
- **Ações**:
  - Primária: **"Voltar ao Início"** (botão grande)
  - Secundária discreta: ícone "Compartilhar" no canto superior, ou link de texto pequeno abaixo do botão principal.
- O **feedback (estrelas + comentário)** vira um **collapse** opcional ("Deixar feedback para o personal ▾") — não bloqueia o fluxo.

**Backend**: contar exercícios concluídos no `useWorkoutTimer.ts` (consulta na tabela `exercicios` com `treino_semanal_id` e `concluido = true`) e adicionar `exerciciosConcluidos` / `exerciciosTotal` ao `WorkoutCompletionData`.

---

## 2. Frase Motivacional Personalizável

**DB (migration)**: adicionar coluna em `personal_settings`:
- `mensagem_conclusao_treino TEXT NULL` (default null → fallback no app)

**`usePersonalSettings.ts`**: incluir o campo no tipo e nos updates.

**`PersonalSettingsDialog.tsx`**: novo `Textarea` "Mensagem ao concluir treino do aluno" + preview.

**`useWorkoutTimer.ts`**: ao concluir, buscar `personal_settings.mensagem_conclusao_treino`. Se vazio, usar fallback profissional fixo `"Treino finalizado com excelência."` (em vez do array aleatório atual com emojis).

---

## 3. Dashboard do Aluno — Personalizável pelo Personal

**DB (migration)** — adicionar em `personal_settings`:
- `welcome_title TEXT` ("Bem-vindo(a) à minha consultoria")
- `welcome_message TEXT` (texto longo da apresentação)
- `jornada_title TEXT` ("Sua Jornada Começa Agora")
- `jornada_message TEXT`
- `cards_visiveis JSONB` (default `["treinos","historico","avaliacao","materiais","plano","biblioteca","chat"]`)

**Novo componente**: `src/components/AlunoDashboardCustomizeDialog.tsx`
- Aberto a partir de `PersonalSettingsDialog` ("Personalizar área do aluno").
- Edita textos de boas-vindas + jornada.
- Lista de cards com switches (mostrar/ocultar).
- Para cada card visível: input opcional de título customizado.

**`AreaAluno.tsx`**:
- Substituir os textos hardcoded ("Seja muito bem-vindo...", "Sua Jornada Começa Agora", etc.) por `personalSettings.welcome_*` com fallback nos textos atuais.
- Renderizar o grid de `ActionCard` filtrando por `cards_visiveis`.

---

## 4. Sistema de Mensagens (PRIORIDADE)

### 4.1. Preview de mensagens no início do aluno

**`AreaAluno.tsx`** (mobile + desktop): adicionar **card "Mensagens" no topo** quando `chatNaoLidas > 0`:
- Mostra: avatar do personal, nome, **última mensagem** (preview, 1 linha), badge com nº não lidas, hora.
- Clique → `setActiveSection("chat")`.
- Hook novo `useUltimaMensagem(personalId, alunoId)` — pega última mensagem (`order desc limit 1`) com realtime.

### 4.2. Destaque visual forte

- `BottomNavigation.tsx` / `MobileHeader.tsx` / sidebar: badge vermelho com pulso animado quando `chatNaoLidas > 0` (já tem badge — adicionar `animate-pulse` + cor `bg-destructive`).
- Card "Chat" no grid de ações: borda destacada quando há não lidas.

### 4.3. Recibos ✓ / ✓✓ corretos (estilo WhatsApp)

Hoje em `ChatPanel.tsx` usa `msg.lida ? "✔✔" : "✔"`. Já está correto **para o remetente**, mas falha quando o destinatário nunca abriu — então **garantir** que `marcarComoLidas` seja chamado:
- Ao abrir o chat (já existe).
- Quando uma nova mensagem chega **com o painel aberto e visível** (listener `visibilitychange` + nova chegada via realtime → marcar imediatamente).

### 4.4. Marcar como "não lida" manualmente

- Em `ChatPanel.tsx`: ao **clicar/segurar** uma mensagem do outro lado, abrir menu (DropdownMenu) com opção "Marcar como não lida".
- Update na linha: `lida = false` (RLS já permite — política "Destinatario pode atualizar lida").
- Atualiza badge global via realtime (já configurado).

### 4.5. Garantir atualização ao abrir conversa

- Em `useChatMessages.ts`: o `marcarComoLidas` atual roda no mount, mas **não dispara update do contador global** (`useChatNaoLidas`) imediatamente. Adicionar broadcast via canal Supabase ou simplesmente confiar no UPDATE realtime do `useChatNaoLidas` (que hoje só ouve INSERT — **bug**). 
- **Fix**: `useChatNaoLidas` deve ouvir também `UPDATE` em `mensagens_chat` para o `destinatario_id` e refazer o count.

---

## Resumo técnico de arquivos

| Arquivo | Tipo | Mudança |
|---|---|---|
| `WorkoutCompletionScreen.tsx` | edit | Layout limpo, fundo sólido, exercícios concluídos, feedback collapse |
| `useWorkoutTimer.ts` | edit | Buscar exercícios concluídos + frase customizada do personal |
| `usePersonalSettings.ts` | edit | Novos campos (mensagem_conclusao, welcome_*, cards_visiveis) |
| `PersonalSettingsDialog.tsx` | edit | Campo de mensagem motivacional + botão "Personalizar área do aluno" |
| `AlunoDashboardCustomizeDialog.tsx` | new | Editor de boas-vindas + visibilidade de cards |
| `AreaAluno.tsx` | edit | Usar textos do personal, filtrar cards, card de preview de mensagens |
| `useChatMessages.ts` | edit | Hook `useUltimaMensagem`, fix `useChatNaoLidas` (escutar UPDATE), marcar não lida manual |
| `ChatPanel.tsx` | edit | Menu "marcar como não lida", auto-mark em mensagens novas com painel ativo |
| `BottomNavigation.tsx` / `MobileHeader.tsx` | edit | Badge pulsante de não lidas |
| `migrations/*.sql` | new | Adicionar colunas em `personal_settings` |

---

## Migration proposta

```sql
ALTER TABLE public.personal_settings
  ADD COLUMN IF NOT EXISTS mensagem_conclusao_treino TEXT,
  ADD COLUMN IF NOT EXISTS welcome_title TEXT,
  ADD COLUMN IF NOT EXISTS welcome_message TEXT,
  ADD COLUMN IF NOT EXISTS jornada_title TEXT,
  ADD COLUMN IF NOT EXISTS jornada_message TEXT,
  ADD COLUMN IF NOT EXISTS cards_visiveis JSONB DEFAULT
    '["treinos","historico","avaliacao","materiais","plano","biblioteca","chat"]'::jsonb;
```

Sem RLS nova (a política existente "Personal gerencia suas configurações" + "Alunos veem configurações do seu personal" já cobre).

---

Posso começar pelo **passo 1 (tela de conclusão)** e seguir na ordem listada. Confirma?
