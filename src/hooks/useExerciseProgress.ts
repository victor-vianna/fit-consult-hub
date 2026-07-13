// hooks/useExerciseProgress.ts
// Hook para persistir progresso de exercícios e blocos no PWA
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { WORKOUT_EVENTS, dispatchWorkoutEvent } from "@/constants/workoutStatus";

const EXERCISE_PROGRESS_KEY = "pwa_exercise_progress";
const BLOCK_PROGRESS_KEY = "pwa_block_progress";

interface ProgressItem {
  concluido: boolean;
  seriesConcluidas?: number;
  timestamp: number;
  synced: boolean;
}

interface ProgressRecord {
  [id: string]: ProgressItem;
}

export function useExerciseProgress(profileId: string) {
  const [pendingSync, setPendingSync] = useState<string[]>([]);
  const [pendingBlockSync, setPendingBlockSync] = useState<string[]>([]);

  const markExerciseSyncState = useCallback((exercicioId: string, synced: boolean) => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return;

      const progress: ProgressRecord = JSON.parse(stored);
      if (!progress[exercicioId]) return;

      progress[exercicioId].synced = synced;
      progress[exercicioId].timestamp = Date.now();
      localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));

      setPendingSync((prev) =>
        synced
          ? prev.filter((id) => id !== exercicioId)
          : Array.from(new Set([...prev, exercicioId]))
      );
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao atualizar sync do exercício:", error);
    }
  }, []);

  const markBlockSyncState = useCallback((blocoId: string, synced: boolean) => {
    try {
      const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
      if (!stored) return;

      const progress: ProgressRecord = JSON.parse(stored);
      if (!progress[blocoId]) return;

      progress[blocoId].synced = synced;
      progress[blocoId].timestamp = Date.now();
      localStorage.setItem(BLOCK_PROGRESS_KEY, JSON.stringify(progress));

      setPendingBlockSync((prev) =>
        synced
          ? prev.filter((id) => id !== blocoId)
          : Array.from(new Set([...prev, blocoId]))
      );
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao atualizar sync do bloco:", error);
    }
  }, []);

  // 🔧 Sincronizar exercícios pendentes
  const sincronizarExerciciosPendentes = useCallback(async () => {
    if (!profileId) return;

    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return;

      const progress: ProgressRecord = JSON.parse(stored);
      const naoSincronizados = Object.entries(progress)
        .filter(([_, data]) => !data.synced)
        .map(([id]) => id);

      if (naoSincronizados.length === 0) return;

      // 🔧 Sincronizar em paralelo com retry
      const results = await Promise.allSettled(
        naoSincronizados.map(async (exercicioId) => {
          const data = progress[exercicioId];
          const payload: Record<string, boolean | number> = {
            concluido: data.concluido,
          };

          if (typeof data.seriesConcluidas === "number") {
            payload.series_concluidas = data.seriesConcluidas;
          }
          
          const { error } = await supabase
            .from("exercicios")
            .update(payload as any)
            .eq("id", exercicioId);

          if (error) {
            // Retry 1x
            const { error: retryError } = await supabase
              .from("exercicios")
              .update(payload as any)
              .eq("id", exercicioId);
            if (retryError) throw retryError;
          }

          return exercicioId;
        })
      );

      // Marcar sincronizados os que deram certo
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          progress[naoSincronizados[index]].synced = true;
        }
      });

      localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
      setPendingSync([]);
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao sincronizar exercícios:", error);
    }
  }, [profileId]);

  // 🔧 Sincronizar blocos pendentes
  const sincronizarBlocosPendentes = useCallback(async () => {
    if (!profileId) return;

    try {
      const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
      if (!stored) return;

      const progress: ProgressRecord = JSON.parse(stored);
      const naoSincronizados = Object.entries(progress)
        .filter(([_, data]) => !data.synced)
        .map(([id]) => id);

      if (naoSincronizados.length === 0) return;

      // 🔧 Sincronizar em paralelo com retry
      const results = await Promise.allSettled(
        naoSincronizados.map(async (blocoId) => {
          const data = progress[blocoId];
          
          const { error } = await supabase
            .from("blocos_treino")
            .update({ 
              concluido: data.concluido,
              concluido_em: data.concluido ? new Date().toISOString() : null
            })
            .eq("id", blocoId);

          if (error) {
            // Retry 1x
            const { error: retryError } = await supabase
              .from("blocos_treino")
              .update({ 
                concluido: data.concluido,
                concluido_em: data.concluido ? new Date().toISOString() : null
              })
              .eq("id", blocoId);
            if (retryError) throw retryError;
          }

          return blocoId;
        })
      );

      // Marcar sincronizados os que deram certo
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          progress[naoSincronizados[index]].synced = true;
        }
      });

      localStorage.setItem(BLOCK_PROGRESS_KEY, JSON.stringify(progress));
      setPendingBlockSync([]);
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao sincronizar blocos:", error);
    }
  }, [profileId]);

  // 🔧 Sincronizar tudo ao montar e quando voltar ao app
  useEffect(() => {
    const sincronizarTudo = async () => {
      await Promise.all([
        sincronizarExerciciosPendentes(),
        sincronizarBlocosPendentes()
      ]);
    };

    // Sincronizar ao montar
    sincronizarTudo();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sincronizarTudo();
      }
    };

    // 🔧 iOS PWA: usar focus como fallback
    const handleFocus = () => {
      sincronizarTudo();
    };

    const handlePageHide = () => {
      sincronizarTudo();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("pagehide", handlePageHide);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [sincronizarExerciciosPendentes, sincronizarBlocosPendentes]);

  // 🔧 Salvar progresso de exercício localmente (síncrono para garantir)
  const salvarProgressoLocal = useCallback((exercicioId: string, concluido: boolean) => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      const progress: ProgressRecord = stored ? JSON.parse(stored) : {};

      const previous = progress[exercicioId];
      progress[exercicioId] = {
        concluido,
        seriesConcluidas: concluido ? previous?.seriesConcluidas : 0,
        timestamp: Date.now(),
        synced: false,
      };

      localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
      setPendingSync(prev => [...prev, exercicioId]);
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao salvar exercício local:", error);
    }
  }, []);

  const salvarSeriesLocal = useCallback((exercicioId: string, seriesConcluidas: number, totalSeries: number) => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      const progress: ProgressRecord = stored ? JSON.parse(stored) : {};
      const safeTotal = Math.max(1, totalSeries);
      const safeSeries = Math.min(Math.max(0, Math.floor(seriesConcluidas)), safeTotal);

      progress[exercicioId] = {
        concluido: safeSeries >= safeTotal,
        seriesConcluidas: safeSeries,
        timestamp: Date.now(),
        synced: false,
      };

      localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
      setPendingSync(prev => Array.from(new Set([...prev, exercicioId])));
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao salvar série local:", error);
    }
  }, []);

  // 🔧 Salvar progresso de bloco localmente
  const salvarBlocoProgressoLocal = useCallback((blocoId: string, concluido: boolean) => {
    try {
      const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
      const progress: ProgressRecord = stored ? JSON.parse(stored) : {};

      progress[blocoId] = {
        concluido,
        timestamp: Date.now(),
        synced: false,
      };

      localStorage.setItem(BLOCK_PROGRESS_KEY, JSON.stringify(progress));
      setPendingBlockSync(prev => [...prev, blocoId]);
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao salvar bloco local:", error);
    }
  }, []);

  // 🔧 Marcar exercício como sincronizado após sucesso no banco
  const marcarSincronizado = useCallback((exercicioId: string) => {
    markExerciseSyncState(exercicioId, true);
  }, [markExerciseSyncState]);

  // 🔧 Marcar bloco como sincronizado
  const marcarBlocoSincronizado = useCallback((blocoId: string) => {
    markBlockSyncState(blocoId, true);
  }, [markBlockSyncState]);

  const persistirExercicioAgora = useCallback(async (exercicioId: string, concluido: boolean) => {
    salvarProgressoLocal(exercicioId, concluido);

    const sync = async () => {
      const payload: Record<string, boolean | number> = { concluido };
      if (!concluido) {
        payload.series_concluidas = 0;
      }

      const { error } = await supabase
        .from("exercicios")
        .update(payload as any)
        .eq("id", exercicioId);

      if (error) throw error;
    };

    try {
      await sync();
      markExerciseSyncState(exercicioId, true);
      return true;
    } catch (error) {
      console.error("[useExerciseProgress] Sync imediato de exercício falhou, tentando retry:", error);
      try {
        await sync();
        markExerciseSyncState(exercicioId, true);
        return true;
      } catch (retryError) {
        console.error("[useExerciseProgress] Retry de exercício falhou, mantido pendente:", retryError);
        markExerciseSyncState(exercicioId, false);
        return false;
      }
    }
  }, [markExerciseSyncState, salvarProgressoLocal]);

  const persistirSeriesAgora = useCallback(async (
    exercicioId: string,
    seriesConcluidas: number,
    totalSeries: number
  ) => {
    const safeTotal = Math.max(1, totalSeries);
    const safeSeries = Math.min(Math.max(0, Math.floor(seriesConcluidas)), safeTotal);
    const concluido = safeSeries >= safeTotal;

    salvarSeriesLocal(exercicioId, safeSeries, safeTotal);

    const sync = async () => {
      const { error } = await supabase
        .from("exercicios")
        .update({
          series_concluidas: safeSeries,
          concluido,
        } as any)
        .eq("id", exercicioId);

      if (error) throw error;
    };

    try {
      await sync();
      markExerciseSyncState(exercicioId, true);
      return true;
    } catch (error) {
      console.error("[useExerciseProgress] Sync imediato de série falhou, tentando retry:", error);
      try {
        await sync();
        markExerciseSyncState(exercicioId, true);
        return true;
      } catch (retryError) {
        console.error("[useExerciseProgress] Retry de série falhou, mantido pendente:", retryError);
        markExerciseSyncState(exercicioId, false);
        return false;
      }
    }
  }, [markExerciseSyncState, salvarSeriesLocal]);

  const persistirBlocoAgora = useCallback(async (blocoId: string, concluido: boolean) => {
    salvarBlocoProgressoLocal(blocoId, concluido);

    const concluidoEm = concluido ? new Date().toISOString() : null;
    const sync = async () => {
      const { error } = await supabase
        .from("blocos_treino")
        .update({
          concluido,
          concluido_em: concluidoEm,
        })
        .eq("id", blocoId);

      if (error) throw error;
    };

    try {
      await sync();
      markBlockSyncState(blocoId, true);
      return true;
    } catch (error) {
      console.error("[useExerciseProgress] Sync imediato de bloco falhou, tentando retry:", error);
      try {
        await sync();
        markBlockSyncState(blocoId, true);
        return true;
      } catch (retryError) {
        console.error("[useExerciseProgress] Retry de bloco falhou, mantido pendente:", retryError);
        markBlockSyncState(blocoId, false);
        return false;
      }
    }
  }, [markBlockSyncState, salvarBlocoProgressoLocal]);

  // 🔧 Obter progresso local de um exercício
  const obterProgressoLocal = useCallback((exercicioId: string): boolean | null => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return null;

      const progress: ProgressRecord = JSON.parse(stored);
      return progress[exercicioId]?.concluido ?? null;
    } catch {
      return null;
    }
  }, []);

  // 🔧 Obter progresso local de um bloco
  const obterBlocoProgressoLocal = useCallback((blocoId: string): boolean | null => {
    try {
      const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
      if (!stored) return null;

      const progress: ProgressRecord = JSON.parse(stored);
      return progress[blocoId]?.concluido ?? null;
    } catch {
      return null;
    }
  }, []);

  // 🔧 Mesclar progresso local com dados do servidor
  const mesclarProgressoExercicios = useCallback(<T extends { id: string; concluido?: boolean }>(
    exercicios: T[]
  ): T[] => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return exercicios;

      const progress: ProgressRecord = JSON.parse(stored);
      
      return exercicios.map(ex => {
        const local = progress[ex.id];
        if (local) {
          // Progresso local não sincronizado tem prioridade
          return {
            ...ex,
            concluido: local.concluido,
            ...(typeof local.seriesConcluidas === "number"
              ? { series_concluidas: local.seriesConcluidas }
              : {}),
          };
        }
        return ex;
      });
    } catch {
      return exercicios;
    }
  }, []);

  // 🔧 Mesclar progresso local de blocos com dados do servidor
  const mesclarProgressoBlocos = useCallback(<T extends { id: string; concluido?: boolean }>(
    blocos: T[]
  ): T[] => {
    try {
      const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
      if (!stored) return blocos;

      const progress: ProgressRecord = JSON.parse(stored);
      
      return blocos.map(bloco => {
        const local = progress[bloco.id];
        if (local) {
          // Progresso local não sincronizado tem prioridade
          return { ...bloco, concluido: local.concluido };
        }
        return bloco;
      });
    } catch {
      return blocos;
    }
  }, []);

  const limparProgressoLocal = useCallback((exercicioIds: string[] = [], blocoIds: string[] = []) => {
    try {
      if (exercicioIds.length > 0) {
        const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
        if (stored) {
          const progress: ProgressRecord = JSON.parse(stored);
          exercicioIds.forEach((id) => delete progress[id]);
          localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
          setPendingSync((prev) => prev.filter((id) => !exercicioIds.includes(id)));
        }
      }

      if (blocoIds.length > 0) {
        const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
        if (stored) {
          const progress: ProgressRecord = JSON.parse(stored);
          blocoIds.forEach((id) => delete progress[id]);
          localStorage.setItem(BLOCK_PROGRESS_KEY, JSON.stringify(progress));
          setPendingBlockSync((prev) => prev.filter((id) => !blocoIds.includes(id)));
        }
      }
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao limpar progresso local:", error);
    }
  }, []);

  // 🔧 Limpar progresso antigo (mais de 7 dias)
  const limparProgressoAntigo = useCallback(() => {
    try {
      const agora = Date.now();
      const seteDias = 7 * 24 * 60 * 60 * 1000;

      // Limpar exercícios
      const storedExercicios = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (storedExercicios) {
        const progress: ProgressRecord = JSON.parse(storedExercicios);
        let atualizado = false;
        Object.keys(progress).forEach(id => {
          if (agora - progress[id].timestamp > seteDias && progress[id].synced) {
            delete progress[id];
            atualizado = true;
          }
        });
        if (atualizado) {
          localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
        }
      }

      // Limpar blocos
      const storedBlocos = localStorage.getItem(BLOCK_PROGRESS_KEY);
      if (storedBlocos) {
        const progress: ProgressRecord = JSON.parse(storedBlocos);
        let atualizado = false;
        Object.keys(progress).forEach(id => {
          if (agora - progress[id].timestamp > seteDias && progress[id].synced) {
            delete progress[id];
            atualizado = true;
          }
        });
        if (atualizado) {
          localStorage.setItem(BLOCK_PROGRESS_KEY, JSON.stringify(progress));
        }
      }
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao limpar antigos:", error);
    }
  }, []);

  // Limpar antigos ao montar
  useEffect(() => {
    limparProgressoAntigo();
  }, [limparProgressoAntigo]);

  return {
    // Exercícios
    salvarProgressoLocal,
    salvarSeriesLocal,
    persistirExercicioAgora,
    persistirSeriesAgora,
    marcarSincronizado,
    obterProgressoLocal,
    mesclarProgressoExercicios,
    limparProgressoLocal,
    pendingSync,
    
    // Blocos
    salvarBlocoProgressoLocal,
    persistirBlocoAgora,
    marcarBlocoSincronizado,
    obterBlocoProgressoLocal,
    mesclarProgressoBlocos,
    pendingBlockSync,
  };
}
