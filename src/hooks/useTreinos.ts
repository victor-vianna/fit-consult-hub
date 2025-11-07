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
import { useExerciseGroups } from "@/hooks/useExerciseGroups";

interface UseTreinosProps {
  profileId: string;
  personalId: string;
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
): QueryKey => ["treinos", profileId, personalId, semana];

const cargaFromDb = (c: string | number | null | undefined): string | null =>
  c == null ? null : String(c);

const cargaForInsert = (c?: string | null): string | null =>
  c == null ? null : String(c);

const cargaForUpdate = (c?: string | null): string | null | undefined =>
  c === undefined ? undefined : c === null ? null : String(c);

const buildInitialTreinos = (): TreinoDia[] =>
  Array.from({ length: 7 }, (_, i) => ({
    dia: i + 1,
    treinoId: null,
    exercicios: [],
    grupos: [],
    descricao: null,
    concluido: false,
  }));

// ✅ Validar e normalizar dia da semana (1-7)
const validarDiaSemana = (dia: number): number => {
  const diaValido = Math.floor(dia);
  if (diaValido < 1 || diaValido > 7 || !Number.isFinite(diaValido)) {
    console.error(`[useTreinos] Dia inválido recebido: ${dia}`);
    throw new Error(`Dia da semana inválido: ${dia}. Deve ser entre 1 e 7.`);
  }
  return diaValido;
};

export function useTreinos({ profileId, personalId }: UseTreinosProps) {
  const queryClient = useQueryClient();
  const { obterGruposDoTreino } = useExerciseGroups({
    profileId,
    personalId,
    enabled: true,
  });
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

      if (treinosError) {
        console.error("❌ Erro ao buscar treinos:", treinosError);
        throw treinosError;
      }

      const treinosCompletos: TreinoDia[] = await Promise.all(
        Array.from({ length: 7 }, async (_, i) => {
          const dia = i + 1;
          const treino = treinosSemanais?.find(
            (t: any) => t.dia_semana === dia
          );

          if (!treino) {
            return {
              dia,
              treinoId: null,
              exercicios: [],
              grupos: [],
              descricao: null,
              concluido: false,
            };
          }

          const { data: exercicios, error: exerciciosError } = await supabase
            .from("exercicios")
            .select("*")
            .eq("treino_semanal_id", treino.id)
            .is("deleted_at", null)
            .order("ordem");

          if (exerciciosError) {
            console.error("❌ Erro ao buscar exercícios:", exerciciosError);
            throw exerciciosError;
          }

          // Mapear cada registro do banco para o tipo Exercicio com conversões corretas
          const exerciciosTipados: Exercicio[] = (exercicios || []).map(
            (ex: any) => {
              const mapped: Exercicio = {
                id: String(ex.id),
                treino_semanal_id:
                  ex.treino_semanal_id != null
                    ? String(ex.treino_semanal_id)
                    : null,
                nome: String(ex.nome ?? ""),
                link_video: ex.link_video ?? null,
                ordem:
                  typeof ex.ordem === "number"
                    ? ex.ordem
                    : Number(ex.ordem ?? 0),
                ordem_no_grupo:
                  ex.ordem_no_grupo != null ? Number(ex.ordem_no_grupo) : null,
                series: ex.series != null ? Number(ex.series) : 3,
                repeticoes: ex.repeticoes ?? "12",
                descanso: ex.descanso != null ? Number(ex.descanso) : 60,
                descanso_entre_grupos:
                  ex.descanso_entre_grupos != null
                    ? Number(ex.descanso_entre_grupos)
                    : null,
                carga: cargaFromDb(ex.carga),
                peso_executado: ex.peso_executado ?? null,
                observacoes: ex.observacoes ?? null,
                concluido: Boolean(ex.concluido),
                grupo_id: ex.grupo_id ?? null,
                tipo_agrupamento: ex.tipo_agrupamento ?? null,
                created_at: ex.created_at ?? null,
                updated_at: ex.updated_at ?? null,
                deleted_at: ex.deleted_at ?? null,
              };
              return mapped;
            }
          );

          // Buscar grupos associados ao treino
          const grupos = await obterGruposDoTreino(treino.id);

          // Buscar blocos do treino
          const { data: blocos } = await supabase
            .from("blocos_treino")
            .select("*")
            .eq("treino_semanal_id", treino.id)
            .is("deleted_at", null)
            .order("posicao", { ascending: true })
            .order("ordem", { ascending: true });

          return {
            dia,
            treinoId: treino.id,
            exercicios: exerciciosTipados,
            grupos,
            blocos: blocos ?? [],
            descricao: treino.descricao ?? null,
            concluido: Boolean(treino.concluido),
          };
        })
      );

      return treinosCompletos;
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!profileId && !!personalId,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  // ✅ Criação automática de treino semanal com validação
  const criarTreinoSeNecessario = useCallback(
    async (dia: number): Promise<string> => {
      // Validar dia antes de usar
      const diaValido = validarDiaSemana(dia);

      const treino = treinos.find((t) => t.dia === diaValido);
      if (treino?.treinoId) {
        console.log(
          `[useTreinos] Treino já existe para dia ${diaValido}:`,
          treino.treinoId
        );
        return treino.treinoId as string;
      }

      const hoje = new Date();
      const inicioDaSemana = new Date(hoje);
      inicioDaSemana.setDate(hoje.getDate() - hoje.getDay() + 1);

      console.log(`[useTreinos] Criando treino semanal para dia ${diaValido}`);

      const { data, error } = await supabase
        .from("treinos_semanais")
        .insert({
          profile_id: profileId,
          personal_id: personalId,
          semana: inicioDaSemana.toISOString().split("T")[0],
          dia_semana: diaValido, // ✅ Usar dia validado
          concluido: false,
        })
        .select()
        .single();

      if (error) {
        console.error(
          `[useTreinos] Erro ao criar treino para dia ${diaValido}:`,
          error
        );
        throw error;
      }

      console.log(`[useTreinos] Treino criado com sucesso:`, data.id);
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
      console.log(
        `[useTreinos] Adicionando exercício para dia ${dia}:`,
        exercicio.nome
      );

      // ✅ Validar dia antes de processar
      const diaValido = validarDiaSemana(dia);

      const validated = exercicioSchema.parse(exercicio);
      const cargaDb = cargaForInsert((exercicio as Partial<Exercicio>).carga);

      const treinoId = await criarTreinoSeNecessario(diaValido);
      const treino = treinos.find((t) => t.dia === diaValido);
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

      if (error) throw error;

      // Converter o objeto retornado do DB para o tipo Exercicio
      const inserted: Exercicio = {
        id: String((data as any).id),
        treino_semanal_id:
          (data as any).treino_semanal_id != null
            ? String((data as any).treino_semanal_id)
            : null,
        nome: String((data as any).nome ?? ""),
        link_video: (data as any).link_video ?? null,
        ordem:
          typeof (data as any).ordem === "number"
            ? (data as any).ordem
            : Number((data as any).ordem ?? 0),
        ordem_no_grupo:
          (data as any).ordem_no_grupo != null
            ? Number((data as any).ordem_no_grupo)
            : null,
        series: (data as any).series != null ? Number((data as any).series) : 3,
        repeticoes: (data as any).repeticoes ?? "12",
        descanso:
          (data as any).descanso != null ? Number((data as any).descanso) : 60,
        descanso_entre_grupos:
          (data as any).descanso_entre_grupos != null
            ? Number((data as any).descanso_entre_grupos)
            : null,
        carga: cargaFromDb((data as any).carga),
        peso_executado: (data as any).peso_executado ?? null,
        observacoes: (data as any).observacoes ?? null,
        concluido: Boolean((data as any).concluido),
        grupo_id: (data as any).grupo_id ?? null,
        tipo_agrupamento: (data as any).tipo_agrupamento ?? null,
        created_at: (data as any).created_at ?? null,
        updated_at: (data as any).updated_at ?? null,
        deleted_at: (data as any).deleted_at ?? null,
      };

      console.log(`[useTreinos] Exercício adicionado:`, inserted.id);
      return { dia: diaValido, exercicio: inserted };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      await refetch();
      toast.success("Exercício adicionado com sucesso");
    },
    onError: (err: any) => {
      console.error("[useTreinos] Erro ao adicionar exercício:", err);
      if (err.code === "23514") {
        toast.error("Erro: Dia da semana inválido");
      } else {
        toast.error("Erro ao adicionar exercício");
      }
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
      console.error("[useTreinos] editarExercicio error:", err);
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
      console.error("[useTreinos] removerExercicio error:", err);
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
      const diaValido = validarDiaSemana(dia);

      await Promise.all(
        exerciciosOrdenados.map((ex, index) =>
          supabase.from("exercicios").update({ ordem: index }).eq("id", ex.id)
        )
      );
      return { dia: diaValido, exerciciosOrdenados };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Ordem atualizada");
    },
    onError: (err) => {
      toast.error("Erro ao atualizar ordem");
      console.error("[useTreinos] reordenarExercicios error:", err);
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
      const diaValido = validarDiaSemana(dia);
      const treinoId = await criarTreinoSeNecessario(diaValido);

      const { error } = await supabase
        .from("treinos_semanais")
        .update({ descricao: descricao || null })
        .eq("id", treinoId);
      if (error) throw error;
      return { dia: diaValido, descricao };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semana),
      });
      toast.success("Grupo muscular atualizado");
    },
    onError: (err) => {
      toast.error("Erro ao atualizar grupo muscular");
      console.error("[useTreinos] editarDescricao error:", err);
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
