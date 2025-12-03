// hooks/useWorkoutBlocks.ts
import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BlocoTreino } from "@/types/workoutBlocks";

interface UseWorkoutBlocksProps {
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
): QueryKey => ["blocos-treino", profileId, personalId, semana];

const garantirTreinoExisteBloco = async (
  treinoSemanalId: string | null,
  profileId: string,
  personalId: string,
  dia?: number
): Promise<string> => {
  // Se o ID já existe, verifica se o registro realmente existe no banco
  if (treinoSemanalId) {
    const { data, error } = await supabase
      .from("treinos_semanais")
      .select("id")
      .eq("id", treinoSemanalId)
      .maybeSingle();

    if (!error && data) {
      return treinoSemanalId;
    }
  }

  // Se não existe ou houve erro, cria um novo
  console.log(
    `[useWorkoutBlocks] Criando treino semanal para dia ${
      dia || "desconhecido"
    }`
  );

  const hoje = new Date();
  const inicioDaSemana = new Date(hoje);
  inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

  const { data: novoTreino, error: createError } = await supabase
    .from("treinos_semanais")
    .insert({
      profile_id: profileId,
      personal_id: personalId,
      semana: inicioDaSemana.toISOString().split("T")[0],
      dia_semana: dia || 1,
      concluido: false,
    })
    .select()
    .single();

  if (createError) {
    console.error("[useWorkoutBlocks] Erro ao criar treino:", createError);
    throw createError;
  }

  return novoTreino.id;
};

export function useWorkoutBlocks({
  profileId,
  personalId,
  enabled = true,
}: UseWorkoutBlocksProps) {
  const queryClient = useQueryClient();
  const semana = getWeekStart();

  // Query para buscar todos os blocos da semana
  const {
    data: blocosPorTreino = {},
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: buildQueryKey(profileId, personalId, semana),
    queryFn: async (): Promise<Record<string, BlocoTreino[]>> => {
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

        // 2. Buscar todos os blocos desses treinos
        const treinoIds = treinosSemanais.map((t) => t.id);
        const { data: blocos, error: blocosError } = await supabase
          .from("blocos_treino")
          .select("*")
          .in("treino_semanal_id", treinoIds)
          .is("deleted_at", null)
          .order("posicao", { ascending: true })
          .order("ordem", { ascending: true });

        if (blocosError) throw blocosError;

        // 3. Agrupar por treino_semanal_id
        const agrupados: Record<string, BlocoTreino[]> = {};
        (blocos || []).forEach((bloco) => {
          const tid = bloco.treino_semanal_id;
          if (!agrupados[tid]) agrupados[tid] = [];
          agrupados[tid].push(bloco as any as BlocoTreino);
        });

        console.log(
          "[useWorkoutBlocks] Blocos carregados:",
          Object.keys(agrupados).length,
          "treinos"
        );
        return agrupados;
      } catch (err) {
        console.error("[useWorkoutBlocks] Erro na query:", err);
        throw err;
      }
    },
    staleTime: 1000 * 60 * 2,
    enabled: enabled && !!profileId && !!personalId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // Mutation: Criar bloco
  const criarBlocoMutation = useMutation({
    mutationFn: async ({
      treinoSemanalId,
      bloco,
    }: {
      treinoSemanalId: string;
      bloco: Partial<BlocoTreino>;
    }) => {
      console.log("[useWorkoutBlocks] Criando bloco:", {
        treinoSemanalId,
        bloco,
      });

      // ✅ GARANTIR que o treino existe antes de criar o bloco
      const treinoIdValido = await garantirTreinoExisteBloco(
        treinoSemanalId,
        profileId,
        personalId
      );

      // 1. Obter próxima ordem
      const posicaoAlvo = bloco.posicao ?? "meio";
      const { data: ultimoBloco, error: queryError } = await supabase
        .from("blocos_treino")
        .select("ordem")
        .eq("treino_semanal_id", treinoIdValido) // ✅ Usar ID validado
        .eq("posicao", posicaoAlvo)
        .is("deleted_at", null)
        .order("ordem", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (queryError && queryError.code !== "PGRST116") {
        throw queryError;
      }

      const proximaOrdem = ultimoBloco ? ultimoBloco.ordem + 1 : 1;

      // 2. Inserir bloco
      const { data, error } = await supabase
        .from("blocos_treino")
        .insert({
          treino_semanal_id: treinoIdValido, // ✅ Usar ID validado
          tipo: bloco.tipo as any,
          posicao: posicaoAlvo,
          ordem: proximaOrdem,
          nome: bloco.nome,
          descricao: bloco.descricao ?? null,
          duracao_estimada_minutos: bloco.duracao_estimada_minutos ?? 10,
          obrigatorio: bloco.obrigatorio ?? false,
          concluido: false,
          config_cardio: bloco.config_cardio ?? null,
          config_alongamento: bloco.config_alongamento ?? null,
          config_aquecimento: bloco.config_aquecimento ?? null,
        } as any)
        .select()
        .single();

      if (error) throw error;

      console.log("[useWorkoutBlocks] Bloco criado:", data.id);
      return {
        treinoSemanalId: treinoIdValido,
        bloco: data as any as BlocoTreino,
      };
    },
    onSuccess: async (_, variables) => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      // ✅ IMPORTANTE: Invalidar também a query de treinos
      await queryClient.invalidateQueries({
        queryKey: ["treinos", profileId, personalId, semana],
      });
      await refetch();
      toast.success("Bloco adicionado com sucesso");
    },
    onError: (error: any) => {
      console.error("[useWorkoutBlocks] Erro ao criar:", error);
      if (error.code === "42P17") {
        toast.error("Erro de permissão. Verifique as políticas RLS.");
      } else {
        toast.error("Erro ao adicionar bloco de treino");
      }
    },
  });

  // Mutation: Atualizar bloco
  const atualizarBlocoMutation = useMutation({
    mutationFn: async ({
      blocoId,
      updates,
    }: {
      blocoId: string;
      updates: Partial<BlocoTreino>;
    }) => {
      console.log("[useWorkoutBlocks] Atualizando bloco:", blocoId);

      const { error } = await supabase
        .from("blocos_treino")
        .update(updates as any)
        .eq("id", blocoId);

      if (error) throw error;
      return { blocoId, updates };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Bloco atualizado com sucesso");
    },
    onError: (error: any) => {
      console.error("[useWorkoutBlocks] Erro ao atualizar:", error);
      if (error.code === "42P17") {
        toast.error("Erro de permissão ao atualizar.");
      } else {
        toast.error("Erro ao atualizar bloco");
      }
    },
  });

  // Mutation: Deletar bloco
  const deletarBlocoMutation = useMutation({
    mutationFn: async (blocoId: string) => {
      console.log("[useWorkoutBlocks] Deletando bloco:", blocoId);

      const { error } = await supabase
        .from("blocos_treino")
        .delete()
        .eq("id", blocoId);

      if (error) throw error;
      return blocoId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Bloco removido com sucesso");
    },
    onError: (error: any) => {
      console.error("[useWorkoutBlocks] Erro ao deletar:", error);
      if (error.code === "42P17") {
        toast.error("Erro de recursão. Verifique as políticas RLS.");
      } else if (error.code === "23503") {
        toast.error("Não é possível deletar: bloco possui dependências.");
      } else {
        toast.error("Erro ao remover bloco");
      }
    },
  });

  // Mutation: Marcar concluído
  const marcarConcluidoMutation = useMutation({
    mutationFn: async ({
      blocoId,
      concluido,
    }: {
      blocoId: string;
      concluido: boolean;
    }) => {
      console.log(
        "[useWorkoutBlocks] Marcando bloco:",
        concluido ? "concluído" : "não concluído"
      );

      const { error } = await supabase
        .from("blocos_treino")
        .update({
          concluido,
          concluido_em: concluido ? new Date().toISOString() : null,
        })
        .eq("id", blocoId);

      if (error) throw error;
      return;
    },
    onMutate: async ({ blocoId, concluido }) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });

      const previous = queryClient.getQueryData<Record<string, BlocoTreino[]>>(
        buildQueryKey(profileId, personalId, semana)
      );

      if (previous) {
        const next = { ...previous };
        Object.keys(next).forEach((treinoId) => {
          next[treinoId] = next[treinoId].map((b) =>
            b.id === blocoId ? { ...b, concluido } : b
          );
        });
        queryClient.setQueryData(
          buildQueryKey(profileId, personalId, semana),
          next
        );
      }

      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(
          buildQueryKey(profileId, personalId, semana),
          context.previous
        );
      }
      toast.error("Erro ao atualizar status do bloco");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
    },
  });

  // Mutation: Reordenar blocos
  const reordenarBlocosMutation = useMutation({
    mutationFn: async ({
      blocos,
    }: {
      blocos: { id: string; ordem: number }[];
    }) => {
      console.log("[useWorkoutBlocks] Reordenando blocos:", blocos.length);

      // Atualizar ordem de cada bloco
      const updates = blocos.map((bloco) =>
        supabase
          .from("blocos_treino")
          .update({ ordem: bloco.ordem })
          .eq("id", bloco.id)
      );

      await Promise.all(updates);
      return blocos;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
    },
    onError: (error: any) => {
      console.error("[useWorkoutBlocks] Erro ao reordenar:", error);
      toast.error("Erro ao reordenar blocos");
    },
  });

  // Função auxiliar para obter blocos de um treino específico
  const obterBlocos = useCallback(
    (treinoSemanalId: string): BlocoTreino[] => {
      return blocosPorTreino[treinoSemanalId] || [];
    },
    [blocosPorTreino]
  );

  return {
    blocosPorTreino,
    loading,
    error,
    obterBlocos,
    criarBloco: (treinoSemanalId: string, bloco: Partial<BlocoTreino>) =>
      criarBlocoMutation.mutateAsync({ treinoSemanalId, bloco }),
    atualizarBloco: (blocoId: string, updates: Partial<BlocoTreino>) =>
      atualizarBlocoMutation.mutateAsync({ blocoId, updates }),
    deletarBloco: (blocoId: string) =>
      deletarBlocoMutation.mutateAsync(blocoId),
    marcarConcluido: async (
      blocoId: string,
      concluido: boolean
    ): Promise<void> =>
      await marcarConcluidoMutation.mutateAsync({ blocoId, concluido }),
    refetch: () => refetch(),
    recarregar: () =>
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      }),
    reordenarBlocos: (blocos: { id: string; ordem: number }[]) =>
      reordenarBlocosMutation.mutateAsync({ blocos }),
    isCriando: criarBlocoMutation.status === "pending",
    isAtualizando: atualizarBlocoMutation.status === "pending",
    isDeletando: deletarBlocoMutation.status === "pending",
    isMarcando: marcarConcluidoMutation.status === "pending",
    isReordenando: reordenarBlocosMutation.status === "pending",
  };
}
