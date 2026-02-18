

# FASE 4 -- Comunicacao e Retencao

## Resumo

Implementar um sistema de chat interno entre personal e aluno, com historico salvo por aluno, e integrar alertas clicaveis que levem diretamente ao chat, perfil do aluno ou historico de treino.

---

## 1. Chat Interno na Plataforma

### Estrutura do banco de dados

Nova tabela `mensagens_chat` para armazenar as mensagens:

```text
CREATE TABLE public.mensagens_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_key TEXT NOT NULL,  -- formato: personal_id::aluno_id
  remetente_id UUID NOT NULL,
  destinatario_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',  -- texto, video (futuro), imagem (futuro)
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indices para performance
CREATE INDEX idx_mensagens_conversa ON public.mensagens_chat(conversa_key, created_at DESC);
CREATE INDEX idx_mensagens_destinatario ON public.mensagens_chat(destinatario_id, lida);

-- RLS
ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;

-- Participantes da conversa podem ver mensagens
CREATE POLICY "Participantes podem ver mensagens"
  ON public.mensagens_chat FOR SELECT
  USING (remetente_id = auth.uid() OR destinatario_id = auth.uid());

-- Usuarios autenticados podem enviar mensagens
CREATE POLICY "Usuarios podem enviar mensagens"
  ON public.mensagens_chat FOR INSERT
  WITH CHECK (remetente_id = auth.uid());

-- Destinatario pode marcar como lida
CREATE POLICY "Destinatario pode atualizar lida"
  ON public.mensagens_chat FOR UPDATE
  USING (destinatario_id = auth.uid());

-- Remetente pode deletar suas mensagens
CREATE POLICY "Remetente pode deletar"
  ON public.mensagens_chat FOR DELETE
  USING (remetente_id = auth.uid());
```

A coluna `tipo` prepara a estrutura para mensagens em video no futuro, sem necessidade de migracao adicional.

### Hook `useChatMessages.ts`

- Carregar mensagens por `conversa_key` com paginacao (scroll infinito).
- Enviar nova mensagem (insert).
- Marcar mensagens como lidas ao abrir conversa.
- Contar mensagens nao lidas para badge.
- **Realtime**: Escutar inserts via `postgres_changes` no canal da conversa para mensagens instantaneas.

### Componente `ChatPanel.tsx`

Interface simples dentro do perfil do aluno (`AlunoDetalhes.tsx`):

- Nova aba "Chat" (icone `MessageSquare`) no TabsList existente (sera a 9a aba, entre "Feedbacks Semanais" e "Financeiro").
- Area de mensagens com scroll, bolhas de chat alinhadas (remetente a direita, destinatario a esquerda).
- Campo de input na parte inferior com botao de enviar.
- Indicador de mensagens nao lidas no trigger da aba.
- Timestamps relativos nas mensagens.

### Componente `ChatPanelAluno.tsx`

Interface equivalente na area do aluno (`AreaAluno.tsx`):

- Nova secao "Chat" no menu lateral / bottom navigation do aluno.
- Mesma interface de chat, mas conectada ao personal do aluno.
- Badge de nao lidas no icone de navegacao.

---

## 2. Integracao com Alertas

### Alertas clicaveis com destinos multiplos

Atualizar o `AlertasModal.tsx` para que cada alerta tenha acoes contextuais:

- **Aluno inativo**: Botoes "Ver perfil" e "Enviar mensagem" (abre perfil na aba chat).
- **Planilha expirando**: Botoes "Ver treinos" (abre perfil na aba treinos).
- **Vencimento assinatura**: Botoes "Ver financeiro" (abre perfil na aba financeiro).
- **Feedback pendente**: Botoes "Ver feedback" (abre perfil na aba checkins) e "Responder" (abre perfil na aba chat).

A navegacao usara query params para indicar a aba destino: `/aluno/{id}?tab=chat`, `/aluno/{id}?tab=treinos`, etc.

### Notificacao ao receber mensagem

Ao enviar uma mensagem no chat, criar automaticamente uma notificacao na tabela `notificacoes` existente para o destinatario:

- Tipo: `nova_mensagem`.
- Titulo: "Nova mensagem de {nome}".
- Dados: `{ aluno_id, profile_id }` para navegacao.

O `NotificacoesDropdown` ja suporta tipos customizados e clique para navegar ao perfil do aluno.

### Badge de mensagens no dashboard

No `PersonalDashboardCards.tsx`, adicionar consulta de mensagens nao lidas totais e exibir badge no card de alertas ou como card separado de "Mensagens pendentes".

---

## Detalhes Tecnicos

### Migracao SQL

```text
-- Tabela de mensagens
CREATE TABLE public.mensagens_chat (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_key TEXT NOT NULL,
  remetente_id UUID NOT NULL,
  destinatario_id UUID NOT NULL,
  conteudo TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'texto',
  lida BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_mensagens_conversa ON public.mensagens_chat(conversa_key, created_at DESC);
CREATE INDEX idx_mensagens_destinatario ON public.mensagens_chat(destinatario_id, lida);

ALTER TABLE public.mensagens_chat ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participantes podem ver mensagens"
  ON public.mensagens_chat FOR SELECT
  USING (remetente_id = auth.uid() OR destinatario_id = auth.uid());

CREATE POLICY "Usuarios podem enviar mensagens"
  ON public.mensagens_chat FOR INSERT
  WITH CHECK (remetente_id = auth.uid());

CREATE POLICY "Destinatario pode atualizar lida"
  ON public.mensagens_chat FOR UPDATE
  USING (destinatario_id = auth.uid());

CREATE POLICY "Remetente pode deletar"
  ON public.mensagens_chat FOR DELETE
  USING (remetente_id = auth.uid());
```

### Novos arquivos

| Arquivo | Descricao |
|---------|-----------|
| `src/hooks/useChatMessages.ts` | Hook com CRUD, realtime e contagem de nao lidas |
| `src/components/chat/ChatPanel.tsx` | Interface de chat reutilizavel (personal e aluno) |

### Arquivos a modificar

| Arquivo | Mudanca |
|---------|---------|
| `src/pages/AlunoDetalhes.tsx` | Adicionar aba "Chat" com `ChatPanel`, ler `?tab=` da URL para aba inicial |
| `src/pages/AreaAluno.tsx` | Adicionar secao "Chat" com `ChatPanel` para o aluno |
| `src/components/dashboard/AlertasModal.tsx` | Botoes de acao contextual com navegacao por query param |
| `src/components/NotificacoesDropdown.tsx` | Suporte ao tipo `nova_mensagem` no icone |
| `src/hooks/useNotificacoes.ts` | (sem mudanca necessaria, ja generico) |

### Ordem de implementacao

1. Migracao SQL (tabela + indices + RLS)
2. Hook `useChatMessages.ts` (CRUD + realtime)
3. Componente `ChatPanel.tsx` (interface de chat)
4. Integrar chat no `AlunoDetalhes.tsx` (nova aba + leitura de query param)
5. Integrar chat no `AreaAluno.tsx` (nova secao para o aluno)
6. Atualizar `AlertasModal.tsx` com acoes contextuais e navegacao
7. Criar notificacao automatica ao enviar mensagem

