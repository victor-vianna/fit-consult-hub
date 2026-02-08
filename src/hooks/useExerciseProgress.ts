// hooks/useExerciseProgress.ts
// Hook para persistir progresso de exercícios e blocos no PWA
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EXERCISE_PROGRESS_KEY = "pwa_exercise_progress";
const BLOCK_PROGRESS_KEY = "pwa_block_progress";

interface ProgressItem {
  concluido: boolean;
  timestamp: number;
  synced: boolean;
}

interface ProgressRecord {
  [id: string]: ProgressItem;
}

export function useExerciseProgress(profileId: string) {
  const [pendingSync, setPendingSync] = useState<string[]>([]);
  const [pendingBlockSync, setPendingBlockSync] = useState<string[]>([]);

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

      // Sincronizar cada exercício pendente
      for (const exercicioId of naoSincronizados) {
        const data = progress[exercicioId];
        
        const { error } = await supabase
          .from("exercicios")
          .update({ concluido: data.concluido })
          .eq("id", exercicioId);

        if (!error) {
          // Marcar como sincronizado
          progress[exercicioId].synced = true;
        }
      }

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

      // Sincronizar cada bloco pendente
      for (const blocoId of naoSincronizados) {
        const data = progress[blocoId];
        
        const { error } = await supabase
          .from("blocos_treino")
          .update({ 
            concluido: data.concluido,
            concluido_em: data.concluido ? new Date().toISOString() : null
          })
          .eq("id", blocoId);

        if (!error) {
          // Marcar como sincronizado
          progress[blocoId].synced = true;
        }
      }

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

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleFocus);
    };
  }, [sincronizarExerciciosPendentes, sincronizarBlocosPendentes]);

  // 🔧 Salvar progresso de exercício localmente (síncrono para garantir)
  const salvarProgressoLocal = useCallback((exercicioId: string, concluido: boolean) => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      const progress: ProgressRecord = stored ? JSON.parse(stored) : {};

      progress[exercicioId] = {
        concluido,
        timestamp: Date.now(),
        synced: false,
      };

      localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
      setPendingSync(prev => [...prev, exercicioId]);
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao salvar exercício local:", error);
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
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return;

      const progress: ProgressRecord = JSON.parse(stored);
      if (progress[exercicioId]) {
        progress[exercicioId].synced = true;
        localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
        setPendingSync(prev => prev.filter(id => id !== exercicioId));
      }
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao marcar sincronizado:", error);
    }
  }, []);

  // 🔧 Marcar bloco como sincronizado
  const marcarBlocoSincronizado = useCallback((blocoId: string) => {
    try {
      const stored = localStorage.getItem(BLOCK_PROGRESS_KEY);
      if (!stored) return;

      const progress: ProgressRecord = JSON.parse(stored);
      if (progress[blocoId]) {
        progress[blocoId].synced = true;
        localStorage.setItem(BLOCK_PROGRESS_KEY, JSON.stringify(progress));
        setPendingBlockSync(prev => prev.filter(id => id !== blocoId));
      }
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao marcar bloco sincronizado:", error);
    }
  }, []);

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
        if (local && !local.synced) {
          // Progresso local não sincronizado tem prioridade
          return { ...ex, concluido: local.concluido };
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
        if (local && !local.synced) {
          // Progresso local não sincronizado tem prioridade
          return { ...bloco, concluido: local.concluido };
        }
        return bloco;
      });
    } catch {
      return blocos;
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
    marcarSincronizado,
    obterProgressoLocal,
    mesclarProgressoExercicios,
    pendingSync,
    
    // Blocos
    salvarBlocoProgressoLocal,
    marcarBlocoSincronizado,
    obterBlocoProgressoLocal,
    mesclarProgressoBlocos,
    pendingBlockSync,
  };
}
