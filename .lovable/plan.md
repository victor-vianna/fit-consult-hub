
# Plano: Melhorias no Cronometro de Treino para PWA Mobile

## Resumo dos Problemas Identificados

O usuario reportou os seguintes problemas:

1. **Timer reinicia ao bloquear celular** - Quando o celular e bloqueado ou o app vai para segundo plano, o cronometro reinicia do zero
2. **Exercicios marcados somem** - Os checkboxes de exercicios concluidos sao perdidos ao voltar ao app
3. **Tempo de descanso nao sincroniza corretamente no feedback** - Os intervalos de descanso nao estao sendo salvos/exibidos corretamente na tela de conclusao
4. **Timer precisa ficar mais visivel** - Para evitar que o aluno esqueca de finalizar o treino

---

## Analise Tecnica

### Problema 1: Timer Reiniciando

**Causa raiz:** O hook `useWorkoutSession` gerencia a persistencia do estado "iniciado" em localStorage, mas quando o usuario navega entre tabs (dias da semana), o componente `WorkoutTimer` e desmontado e remontado. O estado do timer e perdido porque:

1. A key `STORAGE_KEY = "workout_timer_session"` e global (nao diferencia por treino)
2. O `useWorkoutSession` marca dias como "iniciados" mas nao sincroniza adequadamente com o `useWorkoutTimer`
3. Ao voltar do background, o calculo de tempo no `visibilitychange` pode falhar se o localStorage estiver desatualizado

### Problema 2: Exercicios Marcados Somem

**Causa raiz:** O hook `useExerciseProgress` salva progresso localmente, mas:

1. A sincronizacao so acontece quando `visibilityState === "visible"`, e pode haver race conditions
2. O estado local no `WorkoutDayView` (`localTreinos`) nao e restaurado do localStorage ao voltar
3. Os dados do React Query podem sobrescrever o estado local se o refetch ocorrer antes da sincronizacao

### Problema 3: Tempo de Descanso Incorreto

**Causa raiz:** Na funcao `encerrarDescanso`:

1. O `tempoDescansoTotal` e atualizado localmente mas pode nao refletir todos os descansos do banco
2. Na finalizacao, os descansos sao buscados do banco, mas o calculo usa `duracao_segundos` que pode estar null se o descanso nao foi encerrado corretamente
3. Descansos em andamento ao finalizar podem nao ser contabilizados corretamente

---

## Solucao Proposta

### Parte 1: Timer Persistente e Resiliente

**Arquivo:** `src/hooks/useWorkoutTimer.ts`

Melhorias:
- Usar key unica por treino no localStorage: `workout_timer_${treinoId}`
- Salvar timestamp absoluto de inicio ao inves de tempo decorrido
- Recalcular tempo com base em `Date.now() - startTimestamp` ao voltar
- Adicionar evento `focus` como fallback para iOS
- Persistir imediatamente antes de qualquer operacao de saida

**Arquivo:** `src/hooks/useWorkoutSession.ts`

Melhorias:
- Sincronizar estado local com banco ao voltar do background
- Refetch automatico de sessoes ativas ao `visibilitychange`
- Limpar estado de treinos iniciados quando sessao e concluida no banco

### Parte 2: Persistencia de Exercicios Concluidos

**Arquivo:** `src/hooks/useExerciseProgress.ts`

Melhorias:
- Salvar progresso imediatamente (sincrono) no localStorage
- Usar timestamp para resolver conflitos (progresso mais recente ganha)
- Sincronizar pendentes ao voltar e ao montar
- Incluir blocos (`blocos_treino`) no mesmo sistema de persistencia

**Arquivo:** `src/components/WorkoutDayView.tsx`

Melhorias:
- Restaurar estado de exercicios do localStorage ao montar e ao voltar
- Mesclar progresso local com dados do React Query
- Adicionar `refetchOnWindowFocus: true` com merge inteligente

### Parte 3: Correcao do Tempo de Descanso

**Arquivo:** `src/hooks/useWorkoutTimer.ts`

Melhorias na funcao `finalizar`:
- Encerrar descanso ativo automaticamente antes de finalizar
- Esperar confirmacao do banco antes de calcular total
- Usar `SUM` no banco para calcular tempo total de descanso
- Tratar descansos sem `fim` como ativos (calcular duracao em tempo real)

**Arquivo:** `src/hooks/useWorkoutTimer.ts`

Melhorias na funcao `encerrarDescanso`:
- Garantir que o descanso seja salvo no banco antes de atualizar estado
- Atualizar `tempoDescansoTotal` com query ao banco para consistencia
- Adicionar tratamento de erro com retry

### Parte 4: Timer Sempre Visivel

**Arquivo:** `src/components/WorkoutTimer.tsx`

Melhorias:
- Criar versao compacta/sticky do timer para scroll
- Mostrar mini-timer fixo no topo quando scrollar para baixo
- Adicionar indicador visual piscante quando treino esta ativo

**Arquivo:** `src/components/WorkoutDayView.tsx`

Melhorias:
- Mover timer para posicao sticky no topo
- Mostrar indicador de treino ativo mesmo quando scrollar
- Adicionar bottom bar com tempo quando em mobile

---

## Detalhes Tecnicos

### Estrutura de Dados no LocalStorage

```text
// Timer por treino
workout_timer_${treinoId}: {
  sessaoId: string
  startTimestamp: number      // Date.now() do inicio
  pausedTimestamp?: number    // Date.now() quando pausou
  totalPausedMs: number       // Tempo total pausado
  totalRestMs: number         // Tempo total de descanso
  restStartTimestamp?: number // Inicio do descanso atual
  restType?: 'serie' | 'exercicio'
}

// Progresso de exercicios
exercise_progress_${profileId}: {
  [exercicioId]: { concluido: boolean, timestamp: number, synced: boolean }
}

// Progresso de blocos
block_progress_${profileId}: {
  [blocoId]: { concluido: boolean, timestamp: number, synced: boolean }
}
```

### Fluxo de Visibilidade Corrigido

```text
1. App vai para background (visibilitychange: hidden)
   -> Salvar estado atual no localStorage imediatamente
   -> Persistir no banco via sendBeacon ou fetch keepalive

2. App volta do background (visibilitychange: visible)
   -> Ler estado do localStorage
   -> Recalcular tempo baseado em timestamps
   -> Verificar se sessao ainda existe no banco
   -> Mesclar progresso local com estado do banco
   -> Atualizar UI
```

### Calculo de Tempo Robusto

```text
Tempo Total = Date.now() - startTimestamp - totalPausedMs

Onde:
- Se pausado: totalPausedMs += (Date.now() - pausedTimestamp)
- Se em descanso: restMs = Date.now() - restStartTimestamp
- Tempo efetivo = Tempo Total - tempoDescanso
```

---

## Ordem de Implementacao

1. **useWorkoutTimer.ts** - Refatorar persistencia com timestamps absolutos
2. **useWorkoutSession.ts** - Melhorar sincronizacao com banco
3. **useExerciseProgress.ts** - Incluir blocos e melhorar sync
4. **WorkoutTimer.tsx** - Criar versao sticky/mini
5. **WorkoutDayView.tsx** - Integrar timer sticky e restaurar progresso

---

## Resultado Esperado

Apos as mudancas:

1. Timer continua contando corretamente mesmo com celular bloqueado
2. Exercicios e blocos marcados como concluidos persistem entre sessoes
3. Tempo de descanso e calculado e exibido corretamente no feedback
4. Timer fica sempre visivel durante o treino
5. Experiencia mobile otimizada para PWA
