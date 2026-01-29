// hooks/useExerciseProgress.ts
// Hook para persistir progresso de exercícios no PWA
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const EXERCISE_PROGRESS_KEY = "pwa_exercise_progress";

interface ExerciseProgress {
  [exercicioId: string]: {
    concluido: boolean;
    timestamp: number;
    synced: boolean;
  };
}

export function useExerciseProgress(profileId: string) {
  const [pendingSync, setPendingSync] = useState<string[]>([]);

  // Carregar progresso não sincronizado do localStorage
  useEffect(() => {
    const sincronizarPendentes = async () => {
      if (!profileId) return;

      try {
        const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
        if (!stored) return;

        const progress: ExerciseProgress = JSON.parse(stored);
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
        console.error("[useExerciseProgress] Erro ao sincronizar:", error);
      }
    };

    // Sincronizar ao montar e quando voltar ao app
    sincronizarPendentes();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        sincronizarPendentes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [profileId]);

  // Salvar progresso localmente (backup para offline/PWA)
  const salvarProgressoLocal = useCallback((exercicioId: string, concluido: boolean) => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      const progress: ExerciseProgress = stored ? JSON.parse(stored) : {};

      progress[exercicioId] = {
        concluido,
        timestamp: Date.now(),
        synced: false, // Será marcado como true após sincronizar com banco
      };

      localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
      setPendingSync(prev => [...prev, exercicioId]);
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao salvar local:", error);
    }
  }, []);

  // Marcar como sincronizado após sucesso no banco
  const marcarSincronizado = useCallback((exercicioId: string) => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return;

      const progress: ExerciseProgress = JSON.parse(stored);
      if (progress[exercicioId]) {
        progress[exercicioId].synced = true;
        localStorage.setItem(EXERCISE_PROGRESS_KEY, JSON.stringify(progress));
        setPendingSync(prev => prev.filter(id => id !== exercicioId));
      }
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao marcar sincronizado:", error);
    }
  }, []);

  // Obter progresso local de um exercício
  const obterProgressoLocal = useCallback((exercicioId: string): boolean | null => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return null;

      const progress: ExerciseProgress = JSON.parse(stored);
      return progress[exercicioId]?.concluido ?? null;
    } catch {
      return null;
    }
  }, []);

  // Limpar progresso antigo (mais de 7 dias)
  const limparProgressoAntigo = useCallback(() => {
    try {
      const stored = localStorage.getItem(EXERCISE_PROGRESS_KEY);
      if (!stored) return;

      const progress: ExerciseProgress = JSON.parse(stored);
      const agora = Date.now();
      const seteDias = 7 * 24 * 60 * 60 * 1000;

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
    } catch (error) {
      console.error("[useExerciseProgress] Erro ao limpar antigos:", error);
    }
  }, []);

  // Limpar antigos ao montar
  useEffect(() => {
    limparProgressoAntigo();
  }, [limparProgressoAntigo]);

  return {
    salvarProgressoLocal,
    marcarSincronizado,
    obterProgressoLocal,
    pendingSync,
  };
}
