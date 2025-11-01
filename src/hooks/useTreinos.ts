// hooks/useTreinos.ts
import { useCallback } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { exercicioSchema } from "@/lib/schemas/exercicioSchema";
import type { Exercicio, TreinoDia } from "@/types/treino";

interface UseTreinosProps {
  profileId: string;
  personalId: string;
}

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
): QueryKey => ["treinos", profileId, personalId, semana];

const cargaFromDb = (c: string | null | undefined): number | null =>
  c == null ? null : Number(c);

const cargaForInsert = (c?: number | null): string | null =>
  c == null ? null : String(c);

const cargaForUpdate = (c?: number | null): string | null | undefined =>
  c === undefined ? undefined : c === null ? null : String(c);

const buildInitialTreinos = (): TreinoDia[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dia: i + 1,
    treinoId: null,
    exercicios: [],
    descricao: null,
    concluido: false,
  }));

export function useTreinos({ profileId, personalId }: UseTreinosProps) {
  const queryClient = useQueryClient();
  const semana = getWeekStart();

  const {
    data: treinos = buildInitialTreinos(),
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: buildQueryKey(profileId, personalId, semana),
    queryFn: async (): Promise<TreinoDia[]> => {
      const hoje = new Date();
      const inicioDaSemana = new Date(hoje);
      inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

      // 🔥 FIX: Buscar TODOS os treinos deste aluno com este personal nesta semana
      const { data: treinosSemanais, error: treinosError } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .gte("semana", inicioDaSemana.toISOString().split("T")[0])
        .order("dia_semana");

      if (treinosError) {
        console.error("❌ Erro ao buscar treinos:", treinosError);
        throw treinosError;
      }

      console.log("✅ Treinos encontrados:", treinosSemanais);

      const treinosComExercicios: TreinoDia[] = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const dia = i + 1;
          const treino: any = treinosSemanais?.find(
            (t: any) => t.dia_semana === dia
          );

          if (treino) {
            const { data: exercicios, error: exerciciosError } = await supabase
              .from("exercicios")
              .select("*")
              .eq("treino_semanal_id", treino.id)
              .order("ordem");

            if (exerciciosError) {
              console.error("❌ Erro ao buscar exercícios:", exerciciosError);
              throw exerciciosError;
            }

            console.log(`✅ Exercícios dia ${dia}:`, exercicios);

            const exerciciosTipados: Exercicio[] = (exercicios || []).map(
              (ex: any) => ({
                id: ex.id,
                treino_semanal_id: ex.treino_semanal_id,
                nome: ex.nome,
                link_video: ex.link_video,
                ordem: ex.ordem,
                series: ex.series ?? 3,
                repeticoes: ex.repeticoes ?? "12",
                descanso: ex.descanso ?? 60,
                carga: cargaFromDb(ex.carga),
                observacoes: ex.observacoes ?? null,
                concluido: ex.concluido ?? false,
                created_at: ex.created_at,
                updated_at: ex.updated_at,
              })
            );

            return {
              dia,
              treinoId: treino.id,
              exercicios: exerciciosTipados,
              descricao: treino.descricao,
              concluido: treino.concluido,
            };
          }

          return {
            dia,
            treinoId: null,
            exercicios: [],
            descricao: null,
            concluido: false,
          };
        })
      );

      return treinosComExercicios;
    },
    staleTime: 1000 * 60 * 2, // 🔥 FIX: Reduzido para 2 minutos
    enabled: !!profileId && !!personalId,
    refetchOnWindowFocus: true, // 🔥 FIX: Recarregar ao voltar para aba
    refetchOnMount: true, // 🔥 FIX: Recarregar ao montar
  });

  const criarTreinoSeNecessario = useCallback(
    async (dia: number): Promise<string> => {
      const treino = treinos.find((t) => t.dia === dia);
      if (treino?.treinoId) return treino.treinoId as string;

      const hoje = new Date();
      const inicioDaSemana = new Date(hoje);
      inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

      console.log("📝 Criando treino semanal para dia:", dia);

      const { data, error } = await supabase
        .from("treinos_semanais")
        .insert({
          profile_id: profileId,
          personal_id: personalId,
          semana: inicioDaSemana.toISOString().split("T")[0],
          dia_semana: dia,
          concluido: false,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao criar treino:", error);
        throw error;
      }

      console.log("✅ Treino criado:", data);
      return data.id;
    },
    [personalId, profileId, treinos]
  );

  // ---------- Mutations ----------

  const adicionarExercicioMutation = useMutation({
    mutationFn: async ({
      dia,
      exercicio,
    }: {
      dia: number;
      exercicio: Partial<Exercicio>;
    }) => {
      console.log("📝 Adicionando exercício:", { dia, exercicio });

      const validated = exercicioSchema.parse(exercicio);
      const cargaDb = cargaForInsert((exercicio as Partial<Exercicio>).carga);

      const treinoId = await criarTreinoSeNecessario(dia);
      const treino = treinos.find((t) => t.dia === dia);
      const proximaOrdem = treino ? treino.exercicios.length : 0;

      const { data, error } = await supabase
        .from("exercicios")
        .insert({
          treino_semanal_id: treinoId,
          nome: validated.nome,
          link_video: validated.link_video || null,
          ordem: proximaOrdem,
          series: validated.series ?? 3,
          repeticoes: validated.repeticoes ?? "12",
          descanso: validated.descanso ?? 60,
          carga: cargaDb,
          observacoes: validated.observacoes ?? null,
          concluido: false,
        })
        .select()
        .single();

      if (error) {
        console.error("❌ Erro ao inserir exercício:", error);
        throw error;
      }

      console.log("✅ Exercício inserido:", data);

      const inserted: Exercicio = {
        ...(data as any),
        carga: cargaFromDb((data as any).carga),
      };
      return { dia, exercicio: inserted };
    },
    onSuccess: async () => {
      // 🔥 FIX: Invalidar cache de forma mais agressiva
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      // 🔥 FIX: Forçar refetch imediato
      await refetch();
      toast.success("Exercício adicionado com sucesso");
    },
    onError: (err) => {
      toast.error("Erro ao adicionar exercício");
      console.error("❌ Mutation error:", err);
    },
  });

  const editarExercicioMutation = useMutation({
    mutationFn: async ({
      exercicioId,
      dados,
    }: {
      exercicioId: string;
      dados: Partial<Exercicio>;
    }) => {
      const validated = exercicioSchema.partial().parse(dados);
      const payload: Record<string, any> = { ...validated };

      if ((dados as Partial<Exercicio>).carga !== undefined) {
        payload.carga = cargaForUpdate((dados as Partial<Exercicio>).carga);
      }

      const { error } = await supabase
        .from("exercicios")
        .update(payload)
        .eq("id", exercicioId);

      if (error) throw error;
      return { exercicioId, payload };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Exercício atualizado com sucesso");
    },
    onError: (err) => {
      toast.error("Erro ao atualizar exercício");
      console.error("editarExercicio error:", err);
    },
  });

  const removerExercicioMutation = useMutation({
    mutationFn: async (exercicioId: string) => {
      const { error } = await supabase
        .from("exercicios")
        .delete()
        .eq("id", exercicioId);
      if (error) throw error;
      return exercicioId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Exercício removido com sucesso");
    },
    onError: (err) => {
      toast.error("Erro ao remover exercício");
      console.error("removerExercicio error:", err);
    },
  });

  const reordenarExerciciosMutation = useMutation({
    mutationFn: async ({
      dia,
      exerciciosOrdenados,
    }: {
      dia: number;
      exerciciosOrdenados: Exercicio[];
    }) => {
      await Promise.all(
        exerciciosOrdenados.map((ex, index) =>
          supabase.from("exercicios").update({ ordem: index }).eq("id", ex.id)
        )
      );
      return { dia, exerciciosOrdenados };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Ordem atualizada");
    },
    onError: (err) => {
      toast.error("Erro ao atualizar ordem");
      console.error("reordenarExercicios error:", err);
    },
  });

  const editarDescricaoMutation = useMutation({
    mutationFn: async ({
      dia,
      descricao,
    }: {
      dia: number;
      descricao: string | null;
    }) => {
      const treinoId = await criarTreinoSeNecessario(dia);
      const { error } = await supabase
        .from("treinos_semanais")
        .update({ descricao: descricao || null })
        .eq("id", treinoId);
      if (error) throw error;
      return { dia, descricao };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Grupo muscular atualizado");
    },
    onError: (err) => {
      toast.error("Erro ao atualizar grupo muscular");
      console.error("editarDescricao error:", err);
    },
  });

  const marcarExercicioConcluidoMutation = useMutation({
    mutationFn: async ({
      exercicioId,
      concluido,
    }: {
      exercicioId: string;
      concluido: boolean;
    }) => {
      const { error } = await supabase
        .from("exercicios")
        .update({ concluido })
        .eq("id", exercicioId);
      if (error) throw error;
      return { exercicioId, concluido };
    },
    onMutate: async ({ exercicioId, concluido }) => {
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      const previous = queryClient.getQueryData<TreinoDia[]>(
        buildQueryKey(profileId, personalId, semana)
      );
      if (previous) {
        const next = previous.map((t) => ({
          ...t,
          exercicios: t.exercicios.map((e) =>
            e.id === exercicioId ? { ...e, concluido } : e
          ),
        }));
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
      toast.error("Erro ao marcar exercício");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
    },
  });

  return {
    treinos,
    loading,
    error,
    adicionarExercicio: (dia: number, exercicio: Partial<Exercicio>) =>
      adicionarExercicioMutation.mutateAsync({ dia, exercicio }),
    editarExercicio: (exercicioId: string, dados: Partial<Exercicio>) =>
      editarExercicioMutation.mutateAsync({ exercicioId, dados }),
    removerExercicio: (exercicioId: string) =>
      removerExercicioMutation.mutateAsync(exercicioId),
    reordenarExercicios: (dia: number, exerciciosOrdenados: Exercicio[]) =>
      reordenarExerciciosMutation.mutateAsync({ dia, exerciciosOrdenados }),
    editarDescricao: (dia: number, descricao: string | null) =>
      editarDescricaoMutation.mutateAsync({ dia, descricao }),
    marcarExercicioConcluido: (exercicioId: string, concluido: boolean) =>
      marcarExercicioConcluidoMutation.mutateAsync({ exercicioId, concluido }),
    refetch: () => refetch(),
    recarregar: () =>
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      }),
    isAdicionando: adicionarExercicioMutation.status === "pending",
    isEditando: editarExercicioMutation.status === "pending",
    isRemovendo: removerExercicioMutation.status === "pending",
    isReordenando: reordenarExerciciosMutation.status === "pending",
  };
}
