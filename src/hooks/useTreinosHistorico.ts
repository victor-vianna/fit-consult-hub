// src/hooks/useTreinosHistorico.ts
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  addDays,
  endOfMonth,
  format,
  isWithinInterval,
  parseISO,
  startOfMonth,
  subDays,
} from "date-fns";
import { WORKOUT_EVENTS } from "@/constants/workoutStatus";
import { filterWorkoutsWithContent } from "@/utils/workoutContent";

interface TreinoSemanal {
  id: string;
  profile_id: string;
  personal_id: string;
  dia_semana: number;
  semana: string;
  concluido: boolean;
  observacoes: string | null;
  descricao: string | null;
  created_at: string;
  updated_at: string;
  duracao_segundos?: number | null;
}

export function useTreinosHistorico(profileId: string, mes?: Date) {
  const [treinos, setTreinos] = useState<TreinoSemanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    concluidos: 0,
    percentual: 0,
  });

  const [fallbackMes] = useState(() => new Date());
  const mesAtual = mes || fallbackMes;
  const mesKey = format(mesAtual, "yyyy-MM");
  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);

  useEffect(() => {
    fetchTreinos();
  }, [profileId, mesKey]);

  // ✅ Listen for centralized workout events
  useEffect(() => {
    const handleWorkoutCompleted = () => {
      fetchTreinos();
    };
    window.addEventListener(WORKOUT_EVENTS.COMPLETED, handleWorkoutCompleted);
    window.addEventListener(WORKOUT_EVENTS.PROGRESS_CHANGED, handleWorkoutCompleted);
    return () => {
      window.removeEventListener(WORKOUT_EVENTS.COMPLETED, handleWorkoutCompleted);
      window.removeEventListener(WORKOUT_EVENTS.PROGRESS_CHANGED, handleWorkoutCompleted);
    };
  }, [profileId, mesKey]);

  const fetchTreinos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .gte("semana", format(subDays(inicioMes, 6), "yyyy-MM-dd"))
        .lte("semana", format(fimMes, "yyyy-MM-dd"))
        .order("semana", { ascending: true })
        .order("dia_semana", { ascending: true });

      if (error) throw error;

      // Buscar duração das sessões para treinos concluídos
      const treinosComConteudo = await filterWorkoutsWithContent(data || []);
      const treinoIds = treinosComConteudo.map(t => t.id);
      const sessoesConcluidas: Record<string, number | null> = {};
      
      if (treinoIds.length > 0) {
        const { data: sessoes } = await supabase
          .from("treino_sessoes")
          .select("treino_semanal_id, duracao_segundos, fim, created_at")
          .in("treino_semanal_id", treinoIds)
          .eq("status", "concluido")
          .order("fim", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
        
        (sessoes || []).forEach((s: any) => {
          if (sessoesConcluidas[s.treino_semanal_id] === undefined) {
            sessoesConcluidas[s.treino_semanal_id] = s.duracao_segundos ?? null;
          }
        });
      }

      const treinosComDuracao = treinosComConteudo.map(t => ({
        ...t,
        concluido: Boolean(t.concluido || sessoesConcluidas[t.id] !== undefined),
        duracao_segundos: sessoesConcluidas[t.id] ?? null,
      }));

      const treinosDoMes = treinosComDuracao.filter((treino) => {
        const dataTreino = addDays(
          parseISO(treino.semana),
          treino.dia_semana - 1
        );
        return isWithinInterval(dataTreino, { start: inicioMes, end: fimMes });
      });

      setTreinos(treinosDoMes);

      // Calcular estatísticas
      const total = treinosDoMes.length;
      const concluidos = treinosDoMes.filter((t) => t.concluido).length;
      const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;

      setStats({ total, concluidos, percentual });
    } catch (error) {
      console.error("Erro ao buscar treinos:", error);
    } finally {
      setLoading(false);
    }
  };

  const marcarConcluido = async (treinoId: string, concluido: boolean) => {
    try {
      const { error } = await supabase
        .from("treinos_semanais")
        .update({
          concluido,
          updated_at: new Date().toISOString(),
        })
        .eq("id", treinoId);

      if (error) throw error;

      // Atualizar estado local
      setTreinos((prev) =>
        prev.map((t) => (t.id === treinoId ? { ...t, concluido } : t))
      );

      // Recalcular stats
      fetchTreinos();
    } catch (error) {
      console.error("Erro ao marcar treino:", error);
    }
  };

  const adicionarObservacao = async (treinoId: string, observacoes: string) => {
    try {
      const { error } = await supabase
        .from("treinos_semanais")
        .update({
          observacoes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", treinoId);

      if (error) throw error;

      setTreinos((prev) =>
        prev.map((t) => (t.id === treinoId ? { ...t, observacoes } : t))
      );
    } catch (error) {
      console.error("Erro ao adicionar observação:", error);
    }
  };

  return {
    treinos,
    loading,
    stats,
    marcarConcluido,
    adicionarObservacao,
    refetch: fetchTreinos,
  };
}
