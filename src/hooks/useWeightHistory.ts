// hooks/useWeightHistory.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface WeightRecord {
  peso_executado: string;
  data: string; // ISO date
  treino_nome?: string;
}

export interface ExerciseWeightHistory {
  ultimoPeso: string | null;
  ultimaData: string | null;
  historico: WeightRecord[];
  loading: boolean;
}

/**
 * Busca o histórico de peso executado para um exercício pelo nome,
 * filtrando pelo profile_id (aluno) via treinos_semanais.
 */
export function useWeightHistory(exerciseNome: string, profileId: string | null) {
  const query = useQuery({
    queryKey: ["weight-history", exerciseNome?.toLowerCase().trim(), profileId],
    queryFn: async (): Promise<WeightRecord[]> => {
      if (!exerciseNome || !profileId) return [];

      const nomeLimpo = exerciseNome.trim();

      // Buscar exercícios com mesmo nome que tenham peso_executado registrado
      const { data, error } = await supabase
        .from("exercicios")
        .select(`
          peso_executado,
          updated_at,
          treino_semanal_id,
          treinos_semanais!inner (
            profile_id,
            descricao
          )
        `)
        .ilike("nome", nomeLimpo)
        .not("peso_executado", "is", null)
        .not("peso_executado", "eq", "")
        .eq("treinos_semanais.profile_id", profileId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(20);

      if (error) {
        console.error("[useWeightHistory] Erro:", error);
        return [];
      }

      return (data || []).map((item: any) => ({
        peso_executado: item.peso_executado,
        data: item.updated_at,
        treino_nome: item.treinos_semanais?.descricao || undefined,
      }));
    },
    enabled: !!exerciseNome && !!profileId,
    staleTime: 5 * 60 * 1000, // 5 min cache
    gcTime: 10 * 60 * 1000,
  });

  const historico = query.data || [];
  const ultimo = historico[0] || null;

  return {
    ultimoPeso: ultimo?.peso_executado || null,
    ultimaData: ultimo?.data || null,
    historico,
    loading: query.isLoading,
  };
}

/**
 * Hook para buscar histórico de peso de múltiplos exercícios de uma vez (batch).
 * Útil para o personal ver evolução de todos exercícios do aluno.
 */
export function useWeightHistoryBatch(profileId: string | null) {
  return useQuery({
    queryKey: ["weight-history-batch", profileId],
    queryFn: async () => {
      if (!profileId) return {};

      const { data, error } = await supabase
        .from("exercicios")
        .select(`
          nome,
          peso_executado,
          updated_at,
          treinos_semanais!inner (
            profile_id
          )
        `)
        .not("peso_executado", "is", null)
        .not("peso_executado", "eq", "")
        .eq("treinos_semanais.profile_id", profileId)
        .is("deleted_at", null)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        console.error("[useWeightHistoryBatch] Erro:", error);
        return {};
      }

      // Agrupar por nome do exercício
      const grouped: Record<string, WeightRecord[]> = {};
      for (const item of data || []) {
        const key = item.nome.toLowerCase().trim();
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push({
          peso_executado: item.peso_executado!,
          data: item.updated_at,
        });
      }

      return grouped;
    },
    enabled: !!profileId,
    staleTime: 5 * 60 * 1000,
  });
}
