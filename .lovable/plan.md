

# Correcao do Cronometro de Treino (Mobile e Web)

## Problemas Identificados

### 1. Layout sobrepondo no mobile
O timer e os 3 botoes (pausar, finalizar, cancelar) estao todos na mesma linha horizontal (`flex items-center justify-between`). Em telas pequenas (~375px), nao ha espaco suficiente e os elementos se sobrepoem.

### 2. Pause/Resume com resposta lenta
O estado visual (`isPaused`, `isRunning`) so atualiza apos a chamada ao Supabase completar. No mobile com rede lenta, o botao parece nao funcionar.

---

## Plano de Correcao

### Correcao 1: Layout do timer em duas linhas no mobile

Reorganizar o sticky header para usar duas linhas em telas pequenas:
- **Linha 1**: Icone do timer + tempo formatado (grande, centralizado)
- **Linha 2**: Botoes de acao (Pausar/Retomar, Finalizar, Cancelar) distribuidos igualmente

No desktop, manter tudo em uma linha como esta atualmente.

### Correcao 2: Atualizar estado antes da chamada async (otimista)

Na funcao `togglePause`, inverter a ordem: primeiro atualizar o estado local (`setIsPaused`, `setIsRunning`) e os refs dos timestamps, depois fazer a chamada ao Supabase. Se a chamada falhar, reverter o estado. Isso garante resposta visual imediata.

### Correcao 3: Botoes com labels claros no mobile

Em vez de apenas icones, os botoes terao texto:
- Botao de pause: mostra "Pausar" ou "Retomar" com o icone correspondente
- Botao de finalizar: mantem "Finalizar" com check
- Botao de cancelar: mantem apenas o X mas com touch target adequado (44x44px)

---

## Detalhes Tecnicos

### Arquivo: `src/components/WorkoutTimer.tsx`

Substituir o layout atual do sticky header por:

```text
<div className="sticky top-0 z-40 ...">
  {/* Linha 1: Timer */}
  <div className="flex items-center justify-center py-2 gap-2">
    <Timer icon />
    <span className="text-2xl font-mono">{formattedTime}</span>
    {isPaused && <span>Pausado</span>}
  </div>
  
  {/* Linha 2: Botoes */}
  <div className="flex items-center justify-center gap-3 pb-3">
    <Button onClick={togglePause}>
      {isPaused ? "Retomar" : "Pausar"}
    </Button>
    <Button onClick={finalizar}>Finalizar</Button>
    <Button onClick={cancelar}>X</Button>
  </div>
</div>
```

### Arquivo: `src/hooks/useWorkoutTimer.ts`

Na funcao `togglePause` (linha 534), mover as atualizacoes de estado para ANTES da chamada Supabase:

```text
const togglePause = async () => {
  const now = Date.now();
  const vaiPausar = !isPaused;
  
  // Atualizar estado IMEDIATAMENTE (otimista)
  if (vaiPausar) {
    pausedTimestampRef.current = now;
    setIsPaused(true);
    setIsRunning(false);
  } else {
    const tempoPausado = pausedTimestampRef.current 
      ? now - pausedTimestampRef.current : 0;
    totalPausedMsRef.current += tempoPausado;
    pausedTimestampRef.current = null;
    setIsPaused(false);
    setIsRunning(true);
  }
  saveToStorage();
  
  // Persistir no banco (async, sem bloquear UI)
  try {
    await supabase.from("treino_sessoes").update({...}).eq("id", sessaoId);
  } catch (err) {
    // Reverter estado se falhar
    toast.error("Erro ao pausar/retomar");
  }
};
```

### Resultado esperado

1. Timer e botoes nunca se sobrepoem, mesmo em telas de 320px
2. Pausar/Retomar responde instantaneamente ao toque
3. Labels textuais claros ("Pausar" / "Retomar") em vez de apenas icones
4. Touch targets de 44px minimo em todos os botoes
5. Visual limpo e organizado em duas linhas

