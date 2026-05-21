import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ModeloPasta } from "@/hooks/useModeloPastas";
import type {
  LinkDemonstracao,
  ModeloTreino,
  ModeloTreinoBloco,
} from "@/hooks/useModelosTreino";

export type GlobalModeloPasta = ModeloPasta & {
  is_global?: boolean;
  min_plan_level?: number | null;
};

export function useGlobalModelosTreino(enabled = true) {
  return useQuery({
    queryKey: ["global-modelos-treino"],
    queryFn: async (): Promise<{
      modelos: ModeloTreino[];
      pastas: GlobalModeloPasta[];
    }> => {
      const [{ data: pastasData, error: pastasError }, { data: modelosData, error: modelosError }] =
        await Promise.all([
          (supabase as any)
            .from("modelo_pastas")
            .select("*")
            .eq("is_global", true)
            .order("ordem", { ascending: true }),
          (supabase as any)
            .from("treino_modelos")
            .select("*")
            .eq("is_global", true)
            .order("created_at", { ascending: false }),
        ]);

      if (pastasError) throw pastasError;
      if (modelosError) throw modelosError;

      const modelosCompletos = await Promise.all(
        (modelosData || []).map(async (modelo: any) => {
          const [exerciciosData, blocosData] = await Promise.all([
            (supabase as any)
              .from("treino_modelo_exercicios")
              .select("*")
              .eq("modelo_id", modelo.id)
              .order("ordem"),
            (supabase as any)
              .from("treino_modelo_blocos")
              .select("*")
              .eq("modelo_id", modelo.id)
              .order("ordem"),
          ]);

          const blocosTipados: ModeloTreinoBloco[] = (
            blocosData.data || []
          ).map((bloco: any) => ({
            ...bloco,
            tipo: bloco.tipo as ModeloTreinoBloco["tipo"],
            posicao: bloco.posicao as ModeloTreinoBloco["posicao"],
          }));

          return {
            ...modelo,
            min_plan_level: modelo.min_plan_level ?? 1,
            exercicios: (exerciciosData.data || []).map((ex: any) => ({
              ...ex,
              links_demonstracao:
                ex.links_demonstracao as LinkDemonstracao[] | null,
            })),
            blocos: blocosTipados,
          } as ModeloTreino;
        })
      );

      const pastas = (pastasData || []).map((pasta: any) => ({
        ...pasta,
        cor: pasta.cor || "#3b82f6",
        ordem: pasta.ordem ?? 0,
        nivel: pasta.nivel ?? 0,
        min_plan_level: pasta.min_plan_level ?? 1,
      })) as GlobalModeloPasta[];

      return { modelos: modelosCompletos, pastas };
    },
    enabled,
    staleTime: 1000 * 60 * 5,
  });
}
