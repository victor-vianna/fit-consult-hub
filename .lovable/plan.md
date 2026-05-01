## Objetivo

Implementar o **MVP do Painel de Acesso do Aluno** e substituir todos os toggles antigos `Ativo/Bloqueado` pelo novo padrão profissional, em todo o sistema.

## Escopo do MVP

1. Migration leve em `student_access_logs` para registrar motivo + mensagem
2. Novo componente `AccessControlPanel` com diálogo profissional
3. Substituição em **todos os lugares** que hoje usam `StudentActiveToggle` ou botões diretos de bloqueio
4. Tela `/acesso-suspenso` humanizada com motivo e mensagem do personal

Reativação automática por data fica para fase 2 (não entra agora).

---

## 1. Migration

```sql
ALTER TABLE student_access_logs
  ADD COLUMN motivo text,
  ADD COLUMN mensagem_aluno text,
  ADD COLUMN observacao_personal text;
```

Sem CHECK constraint — motivos serão validados no frontend (lista controlada). Compatível com logs antigos (campos nullable).

## 2. Novos componentes

```text
src/components/aluno/AccessControlPanel.tsx     painel completo (status + ações + mini-histórico)
src/components/aluno/ManageAccessDialog.tsx     diálogo de pausar/suspender/reativar
src/components/aluno/AccessHistoryList.tsx      lista de logs de acesso
src/hooks/useStudentAccess.ts                   hook unificado: status, mutate, histórico
```

### `useStudentAccess(studentId)`
- Lê `profiles.is_active` + último registro de `student_access_logs`
- Deriva estado UI: `ativo` | `pausado` | `suspenso`
- Retorna `mutate({ acao, motivo, mensagemAluno, observacao })` que faz update + insert do log numa transação client-side (dois statements, com rollback manual em erro)
- React Query com invalidação correta

### `ManageAccessDialog`
- Se ativo → escolha: Pausar / Suspender
  - Select **Motivo**: Férias, Lesão, Viagem, Inadimplência, Violação de regras, Outro
  - Textarea **Mensagem ao aluno** (pré-preenchida por motivo, editável)
  - Textarea **Observação interna** (opcional, só personal)
- Se bloqueado → botão Reativar + observação opcional
- Sem `confirm()` nativo. Tudo em Dialog do shadcn com loading states.

### `AccessControlPanel`
- Card com badge de status colorido (verde/âmbar/vermelho)
- Última alteração: "Pausado por X há 3 dias — motivo: Férias"
- Botão "Gerenciar acesso"
- Acordeão "Histórico de acesso" → renderiza `AccessHistoryList`

## 3. Substituições no sistema

| Local | Hoje | Depois |
|---|---|---|
| `src/pages/AlunoDetalhes.tsx` | `StudentActiveToggle` + botão duplicado no header | `AccessControlPanel` na aba perfil; header mostra apenas badge de status (read-only) |
| `src/components/AlunosManager.tsx` | Filtro Ativo/Bloqueado + badge na lista | Mantém badge (apenas leitura). Ação só em AlunoDetalhes — remove bloqueio inline se houver |
| `src/components/dashboard/PersonalDashboardCards.tsx` | Possível toggle direto | Remove toggle, mantém badge informativo |
| `src/components/HistoricoAlunoPersonal.tsx` | Verificar uso de `is_active` | Manter apenas leitura |
| `src/components/ui/StudantActiveToggle.tsx` | Componente legado | **Deletar** após migrar todos os usos |

Princípio: **um único lugar para alterar acesso** (página do aluno → painel). Em listas/dashboards é só leitura — evita cliques acidentais e centraliza o fluxo de motivo+mensagem.

## 4. Tela `/acesso-suspenso` humanizada

`src/pages/AcessoSuspenso.tsx` busca o último log de `student_access_logs` do aluno logado e exibe:

- Ícone + título por motivo (Pause para pausa, AlertCircle para suspensão)
- Mensagem personalizada do personal (do log)
- "Suspenso desde DD/MM/YYYY"
- Botão **"Falar com meu personal"** → abre WhatsApp (telefone do personal via `profiles`) ou rota `/aluno?tab=chat` se preferir chat interno
- Botão secundário "Sair"

## 5. Mensagens padrão por motivo

Pré-preenche a textarea de mensagem ao aluno (editável):

- **Férias:** "Seu acesso está pausado durante o período de férias. Bons momentos! Volte quando estiver pronto."
- **Lesão:** "Seu acesso está pausado para sua recuperação. Cuide-se e nos avise quando estiver liberado para retornar."
- **Viagem:** "Acesso pausado durante sua viagem. Boa viagem!"
- **Inadimplência:** "Seu acesso foi temporariamente suspenso. Entre em contato para regularizar e reativar."
- **Violação de regras:** "Seu acesso foi suspenso. Entre em contato para mais informações."
- **Outro:** vazia

## 6. Validações e segurança

- RLS atual de `student_access_logs` já permite insert autenticado e select para personal/admin — ok
- RLS de `profiles` já permite ao personal atualizar `is_active` dos seus alunos — ok
- Frontend bloqueia o botão durante a mutation
- Toast com feedback claro (sucesso/erro)

---

## Ordem de implementação

1. Migration dos 3 campos em `student_access_logs`
2. Hook `useStudentAccess`
3. `ManageAccessDialog` + `AccessControlPanel` + `AccessHistoryList`
4. Integrar em `AlunoDetalhes.tsx` (remover toggle e botão duplicado)
5. Auditar e limpar usos em `AlunosManager`, `PersonalDashboardCards`, `HistoricoAlunoPersonal` (deixar só leitura)
6. Refatorar `AcessoSuspenso.tsx` com motivo+mensagem
7. Deletar `StudentActiveToggle.tsx`

## Resultado

- Um único fluxo profissional para controlar acesso, com motivo + mensagem + auditoria
- Aluno bloqueado entende exatamente o porquê e tem ação clara
- Zero `confirm()` nativos
- Histórico visível e consultável
- Listas e dashboards limpos (só leitura)
