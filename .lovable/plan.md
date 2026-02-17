
# Plano: Correcao Estrutural do Sistema de Acompanhamento de Treinos

## Diagnostico

### Problema 1: Historico nao marca dias como concluidos

**Causa raiz confirmada:** A funcao `finalizar()` em `useWorkoutTimer.ts` (linha 708-831) atualiza apenas a tabela `treino_sessoes` com `status: "concluido"`. Porem, o calendario de historico (`CalendarioTreinosMensal`) e o hook `useTreinosHistorico` leem o campo `concluido` da tabela `treinos_semanais` -- que **nunca e atualizado para `true`** ao finalizar o treino.

Ou seja: o aluno finaliza o treino, a sessao e registrada corretamente, mas o registro principal do dia (`treinos_semanais`) permanece com `concluido = false`.

### Problema 2: Exercicios perdem o check ao sair e voltar

**Causa raiz:** Quando o aluno navega para outra secao (ex: "Inicio") e volta para "Treinos", o componente `TreinosManager` e remontado do zero. O React Query faz um refetch e traz os dados do banco. Se a sincronizacao do `useExerciseProgress` ainda nao enviou os dados ao banco (ou se houve falha silenciosa), o estado local e sobrescrito pelo estado do servidor (onde `concluido = false`).

Alem disso, a atualizacao otimista do `onToggleConcluido` no `useTreinos` apenas chama `supabase.from("exercicios").update({ concluido })`, mas se essa operacao falhar por qualquer motivo (RLS, rede), o usuario nao e avisado e o check e perdido no proximo refetch.

### Problema 3: Estado perdido ao bloquear tela / background

**Causa raiz:** O sistema de persistencia em localStorage (`useExerciseProgress` e `useWorkoutTimer`) foi implementado recentemente, mas ha dois gaps:

1. A sincronizacao dos exercicios pendentes (`sincronizarExerciciosPendentes`) tenta atualizar um exercicio de cada vez em sequencia. Se houver muitos pendentes ou a rede estiver instavel, pode falhar silenciosamente.
2. O merge no `WorkoutDayView` depende de `mesclarProgressoExercicios` funcionar antes do React Query sobrescrever o estado. Porem o `refetchOnWindowFocus: true` do React Query pode disparar antes do merge, causando race condition.

---

## Plano de Correcao

### Correcao 1 (Critica): Marcar `treinos_semanais.concluido = true` ao finalizar

**Arquivo:** `src/hooks/useWorkoutTimer.ts`

Na funcao `finalizar()`, apos atualizar `treino_sessoes.status = "concluido"`, adicionar:

```text
await supabase
  .from("treinos_semanais")
  .update({ concluido: true, updated_at: new Date().toISOString() })
  .eq("id", treinoId);
```

Tambem invalidar as queries relacionadas ao historico para que o calendario atualize imediatamente.

### Correcao 2: Garantir sincronizacao antes do refetch

**Arquivo:** `src/hooks/useExerciseProgress.ts`

- Na funcao `sincronizarExerciciosPendentes`, usar `Promise.allSettled` em vez de um loop sequencial para paralelizar e tolerar falhas parciais.
- Adicionar retry (1 tentativa extra) para exercicios que falharam.

**Arquivo:** `src/components/WorkoutDayView.tsx`

- No handler de `visibilitychange`, garantir que a sincronizacao de progresso ocorra **antes** do refetch do React Query. Usar `await sincronizar()` seguido de `refetch()` em vez de depender de dois listeners independentes.

### Correcao 3: Sincronizacao imediata ao marcar exercicio

**Arquivo:** `src/components/WorkoutDayView.tsx`

O handler `handleToggleExercicio` ja salva localmente e depois tenta sincronizar com o banco. Melhorar para:

- Adicionar retry automatico (1x) em caso de falha de rede.
- Se a falha persistir, manter no localStorage e exibir um indicador visual sutil de "pendente de sincronizacao".

### Correcao 4: Evitar race condition do React Query

**Arquivo:** `src/hooks/useTreinos.ts`

- Desabilitar `refetchOnWindowFocus` para a query de treinos quando houver uma sessao de treino ativa. Isso evita que o React Query sobrescreva o estado otimista enquanto o aluno esta treinando.
- Alternativa: no `onSuccess` da query, aplicar o merge com dados locais antes de retornar.

### Correcao 5: Invalidar historico apos finalizacao

**Arquivo:** `src/hooks/useWorkoutTimer.ts`

Apos finalizar com sucesso, invalidar as queries:
- `["treinos", profileId, personalId, semana]` 
- `["semana-ativa", profileId, personalId]`

Isso garante que ao voltar para a tela inicial, o calendario ja mostre o dia como concluido.

**Arquivo:** `src/components/WorkoutTimer.tsx`

No callback `onWorkoutComplete`, propagar a invalidacao de queries para os componentes pai.

---

## Detalhes Tecnicos

### Fluxo corrigido ao finalizar treino

```text
1. Encerrar descanso ativo (se houver)
2. Persistir tempo final na tabela treino_sessoes (status = "concluido")
3. [NOVO] Atualizar treinos_semanais.concluido = true
4. Buscar descansos do banco para calculo final
5. Enviar notificacao ao personal
6. Limpar localStorage
7. [NOVO] Invalidar queries de treinos e historico
8. Mostrar tela de conclusao
```

### Fluxo corrigido ao voltar do background

```text
1. visibilitychange: "visible" dispara
2. [NOVO] Primeiro: sincronizar exercicios pendentes do localStorage com banco
3. [NOVO] Segundo: apos sync, refetch dos treinos
4. Merge automatico via mesclarProgressoExercicios (ja existente)
5. Timer recalcula tempo via timestamps absolutos (ja existente)
```

### Checklist de RLS

A tabela `treinos_semanais` ja possui a policy que permite alunos atualizarem seus proprios treinos? Verificacao necessaria:
- O aluno (role = aluno) precisa de permissao UPDATE na tabela `treinos_semanais` para o campo `concluido`
- Atualmente nao ha policy explicita para aluno fazer UPDATE em `treinos_semanais`
- Sera necessario criar uma policy RLS permitindo o aluno atualizar `concluido` do seu proprio treino

### Migracao de banco necessaria

```text
CREATE POLICY "aluno_update_concluido_treino"
ON treinos_semanais
FOR UPDATE
TO authenticated
USING (profile_id = auth.uid())
WITH CHECK (profile_id = auth.uid());
```

---

## Ordem de Implementacao

1. Migracao de banco: criar policy RLS para aluno atualizar `treinos_semanais`
2. `useWorkoutTimer.ts`: adicionar update de `treinos_semanais.concluido = true` na funcao `finalizar`
3. `useWorkoutTimer.ts`: invalidar queries de historico apos finalizacao
4. `useExerciseProgress.ts`: melhorar sincronizacao com paralelismo e retry
5. `WorkoutDayView.tsx`: corrigir ordem de sync vs refetch no visibilitychange
6. `useTreinos.ts`: desabilitar refetchOnWindowFocus durante sessao ativa

## Resultado Esperado

1. Ao finalizar treino, o dia aparece como concluido no historico imediatamente
2. Exercicios marcados persistem mesmo ao navegar entre secoes ou bloquear tela
3. Timer continua contando corretamente apos background (ja implementado)
4. Sincronizacao resiliente com retry automatico
5. Sem race conditions entre estado local e dados do servidor
