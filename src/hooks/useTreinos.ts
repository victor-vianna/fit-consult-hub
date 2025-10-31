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
  // shift to Monday
  const diff = d.getDate() - d.getDay() + 1;
  const inicio = new Date(d.setDate(diff));
  return inicio.toISOString().split("T")[0];
};

// Tipagem explícita para evitar ambiguidades de overload do TS
const buildQueryKey = (
  profileId: string,
  personalId: string,
  semana: string
): QueryKey => ["treinos", profileId, personalId, semana];

// helper para converter carga do DB (string|null) para number|null no frontend
const cargaFromDb = (c: string | null | undefined): number | null =>
  c == null ? null : Number(c);

// helper para converter carga do frontend (number|null|undefined) para DB (string|null|undefined)
// - para Insert: use `cargaForInsert(valor)` (retorna string | null)
// - para Update: use `cargaForUpdate(valor)` (retorna string | null | undefined) — undefined = não incluir no payload
const cargaForInsert = (c?: number | null): string | null =>
  c == null ? null : String(c);

const cargaForUpdate = (c?: number | null): string | null | undefined =>
  c === undefined ? undefined : c === null ? null : String(c);

// cria um array inicial com 7 dias vazios para exibir imediatamente
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

      const { data: treinosSemanais, error: treinosError } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .gte("semana", inicioDaSemana.toISOString().split("T")[0])
        .order("dia_semana");

      if (treinosError) throw treinosError;

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

            if (exerciciosError) throw exerciciosError;

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
    staleTime: 1000 * 60 * 5, // 5 minutos
    enabled: !!profileId && !!personalId,
    initialData: buildInitialTreinos(),
    refetchOnWindowFocus: false,
  });

  const criarTreinoSeNecessario = useCallback(
    async (dia: number): Promise<string> => {
      const treino = treinos.find((t) => t.dia === dia);
      if (treino?.treinoId) return treino.treinoId as string;

      const hoje = new Date();
      const inicioDaSemana = new Date(hoje);
      inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

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

      if (error) throw error;
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
      const validated = exercicioSchema.parse(exercicio);

      // converter carga para string|null para inserir no banco
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
          carga: cargaDb, // string | null
          observacoes: validated.observacoes ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      // mapear carga de volta para number|null
      const inserted: Exercicio = {
        ...(data as any),
        carga: cargaFromDb((data as any).carga),
      };
      return { dia, exercicio: inserted };
    },
    onMutate: async ({ dia, exercicio }) => {
      await queryClient.cancelQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      const previous = queryClient.getQueryData<TreinoDia[]>(
        buildQueryKey(profileId, personalId, semana)
      );

      if (previous) {
        const next = previous.map((t) => {
          if (t.dia !== dia) return t;
          const temp: Exercicio = {
            id: `temp-${Date.now()}`,
            treino_semanal_id: t.treinoId ?? "",
            nome: (exercicio.nome as string) || "Novo exercício",
            link_video: (exercicio.link_video as string) || null,
            ordem: t.exercicios.length,
            series: exercicio.series ?? 3,
            repeticoes: exercicio.repeticoes ?? "12",
            descanso: exercicio.descanso ?? 60,
            carga: (exercicio as Partial<Exercicio>).carga ?? null,
            observacoes: exercicio.observacoes ?? null,
            concluido: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          return { ...t, exercicios: [...t.exercicios, temp] };
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
      toast.error("Erro ao adicionar exercício");
      console.error("adicionarExercicio error:", _err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Exercício adicionado com sucesso");
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
    onMutate: async ({ exercicioId, dados }) => {
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
            e.id === exercicioId ? { ...e, ...dados } : e
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
      toast.error("Erro ao atualizar exercício");
      console.error("editarExercicio error:", _err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Exercício atualizado com sucesso");
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
    onMutate: async (exercicioId: string) => {
      await queryClient.cancelQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      const previous = queryClient.getQueryData<TreinoDia[]>(
        buildQueryKey(profileId, personalId, semana)
      );
      if (previous) {
        const next = previous.map((t) => ({
          ...t,
          exercicios: t.exercicios.filter((e) => e.id !== exercicioId),
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
      toast.error("Erro ao remover exercício");
      console.error("removerExercicio error:", _err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Exercício removido com sucesso");
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
    onMutate: async ({ dia, exerciciosOrdenados }) => {
      await queryClient.cancelQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      const previous = queryClient.getQueryData<TreinoDia[]>(
        buildQueryKey(profileId, personalId, semana)
      );
      if (previous) {
        const next = previous.map((t) => {
          if (t.dia !== dia) return t;
          const map = new Map(t.exercicios.map((e) => [e.id, e]));
          const newExs = exerciciosOrdenados.map((ex, idx) => {
            const original = map.get(ex.id);
            return original
              ? { ...original, ordem: idx }
              : { ...ex, ordem: idx };
          });
          return { ...t, exercicios: newExs };
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
      toast.error("Erro ao atualizar ordem");
      console.error("reordenarExercicios error:", _err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Ordem atualizada");
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
    onSuccess: () => {
      queryClient.invalidateQueries({
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
      console.error("marcarExercicioConcluido error:", _err);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
    },
  });

  return {
    treinos,
    loading,
    error,
    // funções expostas (API consistente com versão mais completa)
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
    // refetch / recarregar
    refetch: () => refetch(),
    recarregar: () =>
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      }),
    // estados de loading das mutations (React Query v5 usa "pending")
    isAdicionando: adicionarExercicioMutation.status === "pending",
    isEditando: editarExercicioMutation.status === "pending",
    isRemovendo: removerExercicioMutation.status === "pending",
    isReordenando: reordenarExerciciosMutation.status === "pending",
  };
}
