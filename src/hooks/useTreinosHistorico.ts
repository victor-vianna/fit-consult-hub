// src/hooks/useTreinosHistorico.ts
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

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
}

export function useTreinosHistorico(profileId: string, mes?: Date) {
  const [treinos, setTreinos] = useState<TreinoSemanal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    concluidos: 0,
    percentual: 0,
  });

  const mesAtual = mes || new Date();
  const inicioMes = startOfMonth(mesAtual);
  const fimMes = endOfMonth(mesAtual);

  useEffect(() => {
    fetchTreinos();
  }, [profileId, mesAtual]);

  const fetchTreinos = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .gte("semana", format(inicioMes, "yyyy-MM-dd"))
        .lte("semana", format(fimMes, "yyyy-MM-dd"))
        .order("semana", { ascending: true })
        .order("dia_semana", { ascending: true });

      if (error) throw error;

      setTreinos(data || []);

      // Calcular estatísticas
      const total = data?.length || 0;
      const concluidos = data?.filter((t) => t.concluido).length || 0;
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
