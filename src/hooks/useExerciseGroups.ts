// hooks/useExerciseGroups.ts
import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type TipoAgrupamento =
  | "normal"
  | "bi-set"
  | "tri-set"
  | "drop-set"
  | "superset";

export interface ExercicioInput {
  id?: string;
  nome: string;
  link_video?: string | null;
  series: number;
  repeticoes: string;
  descanso?: number;
  carga?: string | number | null;
  observacoes?: string | null;
  ordem?: number | null;
}

export interface GrupoExerciciosInput {
  tipo: TipoAgrupamento;
  titulo?: string | null;
  descanso_entre_grupos?: number | null;
  exercicios: ExercicioInput[];
}

export interface GrupoExercicio {
  grupo_id: string;
  tipo_agrupamento: TipoAgrupamento;
  descanso_entre_grupos?: number | null;
  ordem: number;
  exercicios: any[];
}

interface UseExerciseGroupsProps {
  profileId: string;
  personalId: string;
  enabled?: boolean;
}

// Utilitário: retorna início da semana (segunda-feira)
const getWeekStart = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const diff = d.getDate() - d.getDay() + 1;
  const inicio = new Date(d.setDate(diff));
  return inicio.toISOString().split("T")[0];
};

const buildQueryKey = (
  profileId: string,
  personalId: string,
  semana: string
): QueryKey => ["grupos-exercicios", profileId, personalId, semana];

// Gera UUID no client
const genUUID = () => {
  if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function useExerciseGroups({
  profileId,
  personalId,
  enabled = true,
}: UseExerciseGroupsProps) {
  const queryClient = useQueryClient();
  const semana = getWeekStart();

  // Query para buscar todos os grupos da semana
  const {
    data: gruposPorTreino = {},
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: buildQueryKey(profileId, personalId, semana),
    queryFn: async (): Promise<Record<string, GrupoExercicio[]>> => {
      try {
        const hoje = new Date();
        const inicioDaSemana = new Date(hoje);
        inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

        // 1. Buscar treinos semanais
        const { data: treinosSemanais, error: treinosError } = await supabase
          .from("treinos_semanais")
          .select("id")
          .eq("profile_id", profileId)
          .eq("personal_id", personalId)
          .gte("semana", inicioDaSemana.toISOString().split("T")[0]);

        if (treinosError) throw treinosError;
        if (!treinosSemanais || treinosSemanais.length === 0) return {};

        // 2. Buscar todos os exercícios com grupo_id
        const treinoIds = treinosSemanais.map((t) => t.id);
        const { data: exercicios, error: exerciciosError } = await supabase
          .from("exercicios")
          .select("*")
          .in("treino_semanal_id", treinoIds)
          .not("grupo_id", "is", null)
          .is("deleted_at", null)
          .order("ordem", { ascending: true })
          .order("ordem_no_grupo", { ascending: true });

        if (exerciciosError) throw exerciciosError;

        // 3. Agrupar por treino_semanal_id e grupo_id
        const resultado: Record<string, GrupoExercicio[]> = {};

        (exercicios || []).forEach((ex) => {
          const tid = ex.treino_semanal_id;
          const gid = ex.grupo_id;
          if (!gid) return;

          if (!resultado[tid]) resultado[tid] = [];

          let grupo = resultado[tid].find((g) => g.grupo_id === gid);
          if (!grupo) {
            grupo = {
              grupo_id: gid,
              tipo_agrupamento:
                (ex.tipo_agrupamento as TipoAgrupamento) || "normal",
              descanso_entre_grupos: ex.descanso_entre_grupos ?? null,
              ordem: ex.ordem ?? Number.MAX_SAFE_INTEGER,
              exercicios: [],
            };
            resultado[tid].push(grupo);
          }

          grupo.exercicios.push(ex);
          const ordemAtual = ex.ordem ?? Number.MAX_SAFE_INTEGER;
          if (ordemAtual < grupo.ordem) grupo.ordem = ordemAtual;
        });

        // Ordenar grupos por ordem
        Object.keys(resultado).forEach((tid) => {
          resultado[tid].sort((a, b) => a.ordem - b.ordem);
        });

        console.log(
          "[useExerciseGroups] Grupos carregados:",
          Object.keys(resultado).length,
          "treinos"
        );
        return resultado;
      } catch (err) {
        console.error("[useExerciseGroups] Erro na query:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!profileId && !!personalId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Mutation: Criar grupo
  const criarGrupoMutation = useMutation({
    mutationFn: async ({
      treinoSemanalId,
      payload,
    }: {
      treinoSemanalId: string;
      payload: GrupoExerciciosInput;
    }) => {
      console.log("[useExerciseGroups] Criando grupo:", {
        treinoSemanalId,
        tipo: payload.tipo,
        exercicios: payload.exercicios.length,
      });

      const grupoId = genUUID();

      // 1. Calcular ordem base
      const { data: ordemData, error: ordemErr } = await supabase
        .from("exercicios")
        .select("ordem")
        .eq("treino_semanal_id", treinoSemanalId)
        .is("deleted_at", null)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (ordemErr && ordemErr.code !== "PGRST116") {
        throw ordemErr;
      }

      let proximaOrdemBase = 1;
      if (ordemData && ordemData.ordem != null) {
        proximaOrdemBase = Number(ordemData.ordem) + 1;
      }

      // 2. Montar inserts
      const inserts = payload.exercicios.map((ex, idx) => ({
        treino_semanal_id: treinoSemanalId,
        nome: ex.nome,
        link_video: ex.link_video ?? null,
        series: ex.series,
        repeticoes: ex.repeticoes,
        descanso: ex.descanso ?? 0,
        carga: ex.carga != null ? String(ex.carga) : null,
        observacoes: ex.observacoes ?? null,
        ordem: proximaOrdemBase,
        grupo_id: grupoId,
        tipo_agrupamento: String(payload.tipo),
        ordem_no_grupo: idx + 1,
        descanso_entre_grupos: payload.descanso_entre_grupos ?? null,
        concluido: false,
      }));

      // 3. Inserir em lote
      const { data: inserted, error: insertErr } = await supabase
        .from("exercicios")
        .insert(inserts)
        .select("*");

      if (insertErr) throw insertErr;

      console.log("[useExerciseGroups] Grupo criado:", grupoId);

      return {
        treinoSemanalId,
        grupo: {
          grupo_id: grupoId,
          tipo_agrupamento: payload.tipo,
          descanso_entre_grupos: payload.descanso_entre_grupos ?? null,
          ordem: proximaOrdemBase,
          exercicios: inserted ?? [],
        } as GrupoExercicio,
      };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Grupo de exercícios criado com sucesso");
    },
    onError: (error: any) => {
      console.error("[useExerciseGroups] Erro ao criar grupo:", error);
      toast.error("Erro ao criar grupo de exercícios");
    },
  });

  // Mutation: Adicionar exercício ao grupo
  const adicionarExercicioMutation = useMutation({
    mutationFn: async ({
      grupoId,
      treinoSemanalId,
      exercicio,
    }: {
      grupoId: string;
      treinoSemanalId: string;
      exercicio: ExercicioInput;
    }) => {
      console.log(
        "[useExerciseGroups] Adicionando exercício ao grupo:",
        grupoId
      );

      // Calcular próxima ordem_no_grupo
      const { data: itensDoGrupo, error: itensErr } = await supabase
        .from("exercicios")
        .select("ordem_no_grupo")
        .eq("grupo_id", grupoId)
        .is("deleted_at", null)
        .order("ordem_no_grupo", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (itensErr && itensErr.code !== "PGRST116") {
        throw itensErr;
      }

      let proximaOrdemNoGrupo = 1;
      if (itensDoGrupo && itensDoGrupo.ordem_no_grupo != null) {
        proximaOrdemNoGrupo = Number(itensDoGrupo.ordem_no_grupo) + 1;
      }

      const insertObj = {
        treino_semanal_id: treinoSemanalId,
        nome: exercicio.nome,
        link_video: exercicio.link_video ?? null,
        series: exercicio.series,
        repeticoes: exercicio.repeticoes,
        descanso: exercicio.descanso ?? 0,
        carga: exercicio.carga != null ? String(exercicio.carga) : null,
        observacoes: exercicio.observacoes ?? null,
        ordem: exercicio.ordem ?? null,
        grupo_id: grupoId,
        tipo_agrupamento: "bi-set",
        ordem_no_grupo: proximaOrdemNoGrupo,
        descanso_entre_grupos: null,
        concluido: false,
      };

      const { data, error } = await supabase
        .from("exercicios")
        .insert([insertObj])
        .select()
        .single();

      if (error) throw error;
      return { grupoId, exercicio: data };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Exercício adicionado ao grupo");
    },
    onError: (error: any) => {
      console.error("[useExerciseGroups] Erro ao adicionar exercício:", error);
      toast.error("Erro ao adicionar exercício ao grupo");
    },
  });

  // Mutation: Atualizar metadados do grupo
  const atualizarMetaGrupoMutation = useMutation({
    mutationFn: async ({
      grupoId,
      dataPatch,
    }: {
      grupoId: string;
      dataPatch: {
        tipo_agrupamento?: TipoAgrupamento;
        descanso_entre_grupos?: number | null;
      };
    }) => {
      console.log("[useExerciseGroups] Atualizando meta do grupo:", grupoId);

      const payload: any = {};
      if (dataPatch.tipo_agrupamento != null)
        payload.tipo_agrupamento = String(dataPatch.tipo_agrupamento);
      if ("descanso_entre_grupos" in dataPatch)
        payload.descanso_entre_grupos = dataPatch.descanso_entre_grupos ?? null;

      const { error } = await supabase
        .from("exercicios")
        .update(payload)
        .eq("grupo_id", grupoId);

      if (error) throw error;
      return { grupoId, dataPatch };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Grupo atualizado com sucesso");
    },
    onError: (error: any) => {
      console.error("[useExerciseGroups] Erro ao atualizar meta:", error);
      toast.error("Erro ao atualizar grupo");
    },
  });

  // Mutation: Deletar grupo
  const deletarGrupoMutation = useMutation({
    mutationFn: async (grupoId: string) => {
      console.log("[useExerciseGroups] Deletando grupo:", grupoId);

      // Soft delete
      const { error } = await supabase
        .from("exercicios")
        .update({ deleted_at: new Date().toISOString() })
        .eq("grupo_id", grupoId);

      if (error) throw error;
      return grupoId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Grupo removido com sucesso");
    },
    onError: (error: any) => {
      console.error("[useExerciseGroups] Erro ao deletar grupo:", error);
      toast.error("Erro ao remover grupo");
    },
  });

  // Função auxiliar para obter grupos de um treino específico
  const obterGruposDoTreino = useCallback(
    (treinoSemanalId: string): GrupoExercicio[] => {
      return gruposPorTreino[treinoSemanalId] || [];
    },
    [gruposPorTreino]
  );

  return {
    gruposPorTreino,
    loading,
    error,
    obterGruposDoTreino,
    criarGrupo: (treinoSemanalId: string, payload: GrupoExerciciosInput) =>
      criarGrupoMutation.mutateAsync({ treinoSemanalId, payload }),
    adicionarExercicioAoGrupo: (
      grupoId: string,
      treinoSemanalId: string,
      exercicio: ExercicioInput
    ) =>
      adicionarExercicioMutation.mutateAsync({
        grupoId,
        treinoSemanalId,
        exercicio,
      }),
    atualizarMetaGrupo: (
      grupoId: string,
      dataPatch: {
        tipo_agrupamento?: TipoAgrupamento;
        descanso_entre_grupos?: number | null;
      }
    ) => atualizarMetaGrupoMutation.mutateAsync({ grupoId, dataPatch }),
    deletarGrupo: (grupoId: string) =>
      deletarGrupoMutation.mutateAsync(grupoId),
    refetch: () => refetch(),
    recarregar: () =>
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      }),
    isCriando: criarGrupoMutation.status === "pending",
    isAdicionando: adicionarExercicioMutation.status === "pending",
    isAtualizando: atualizarMetaGrupoMutation.status === "pending",
    isDeletando: deletarGrupoMutation.status === "pending",
  };
}
