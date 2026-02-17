// hooks/useTreinos.ts
import { useCallback, useState, useEffect } from "react";
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
import {
  getWeekStart,
  getPreviousWeekStart,
  getNextWeekStart,
  isCurrentWeek,
} from "@/utils/weekUtils";
import { useExerciseProgress } from "@/hooks/useExerciseProgress";
import { hidratarBlocoComTemplate } from "@/types/workoutBlocks";


interface UseTreinosProps {
  profileId: string;
  personalId: string;
  initialWeek?: string;
}

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

export function useTreinos({ profileId, personalId, initialWeek }: UseTreinosProps) {
  const queryClient = useQueryClient();
  const { obterGruposDoTreino } = useExerciseGroups({
    profileId,
    personalId,
    enabled: true,
  });
  
  // 🔧 Hook para persistência de progresso PWA
  const { salvarProgressoLocal, marcarSincronizado } = useExerciseProgress(profileId);
  
  // Estado para semana selecionada (navegável)
  const [semanaSelecionada, setSemanaSelecionada] = useState<string>(
    initialWeek || getWeekStart()
  );

  // Query separada para buscar semana ativa do personal
  const { data: semanaAtivaData } = useQuery({
    queryKey: ["semana-ativa", profileId, personalId],
    queryFn: async () => {
      const { data } = await supabase
        .from("treino_semana_ativa")
        .select("semana_inicio")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .maybeSingle();
      
      return data?.semana_inicio || null;
    },
    enabled: !!profileId && !!personalId,
    staleTime: 1000 * 60 * 5,
  });

  // ✅ A semana a ser buscada: prioriza semana selecionada, depois ativa, depois atual
  const semanaParaBuscar = semanaSelecionada;

  const {
    data: treinos = buildInitialTreinos(),
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    // ✅ CORREÇÃO: queryKey usa semanaParaBuscar (a mesma que é buscada)
    queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
    queryFn: async (): Promise<TreinoDia[]> => {
      console.log(`[useTreinos] Buscando treinos para semana: ${semanaParaBuscar}`);

      const { data: treinosSemanais, error: treinosError } = await supabase
        .from("treinos_semanais")
        .select("*")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .eq("semana", semanaParaBuscar)
        .order("dia_semana")
        .order("ordem_no_dia", { ascending: true });

      if (treinosError) {
        console.error("❌ Erro ao buscar treinos:", treinosError);
        throw treinosError;
      }

      // Agrupar treinos por dia_semana (suporta múltiplos treinos por dia)
      const treinosPorDia = new Map<number, any[]>();
      (treinosSemanais || []).forEach((treino: any) => {
        const dia = treino.dia_semana;
        if (!treinosPorDia.has(dia)) {
          treinosPorDia.set(dia, []);
        }
        treinosPorDia.get(dia)!.push(treino);
      });

      // Processar todos os treinos (flatten para manter compatibilidade com a UI atual)
      const todosTreinos: TreinoDia[] = [];

      for (let i = 0; i < 7; i++) {
        const dia = i + 1;
        const treinosDoDia = treinosPorDia.get(dia) || [];

        if (treinosDoDia.length === 0) {
          // Dia sem treino - adicionar placeholder
          todosTreinos.push({
            dia,
            treinoId: null,
            exercicios: [],
            grupos: [],
            descricao: null,
            concluido: false,
            nome_treino: undefined,
            ordem_no_dia: 1,
          });
        } else {
          // Processar cada treino do dia
          for (const treino of treinosDoDia) {
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

            const blocosHidratados = (blocos ?? []).map((b: any) =>
              hidratarBlocoComTemplate(b)
            );

            todosTreinos.push({
              dia,
              treinoId: treino.id,
              exercicios: exerciciosTipados,
              grupos,
              blocos: blocosHidratados,
              descricao: treino.descricao ?? null,
              concluido: Boolean(treino.concluido),
              nome_treino: treino.nome_treino || undefined,
              ordem_no_dia: treino.ordem_no_dia || 1,
            });
          }
        }
      }

      return todosTreinos;
    },
    staleTime: 1000 * 60 * 2,
    enabled: !!profileId && !!personalId,
    // 🔧 CORREÇÃO: Desabilitar refetchOnWindowFocus para evitar race condition
    // A sincronização é feita manualmente via visibilitychange com ordem controlada
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    // 🔧 PWA: Manter dados mais atualizados
    refetchOnReconnect: true,
  });

  // 🔧 CORREÇÃO: Sync primeiro, refetch depois ao voltar do background
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && profileId && personalId) {
        // Aguardar sync do useExerciseProgress (via evento)
        // Delay para garantir que a sync do localStorage ocorreu
        await new Promise(r => setTimeout(r, 800));
        refetch();
      }
    };

    // 🔧 Invalidar queries quando treino é finalizado
    const handleWorkoutCompleted = () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      });
      queryClient.invalidateQueries({
        queryKey: ["semana-ativa", profileId, personalId],
      });
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("workout-completed", handleWorkoutCompleted);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("workout-completed", handleWorkoutCompleted);
    };
  }, [profileId, personalId, refetch, queryClient, semanaParaBuscar]);

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

      console.log(`[useTreinos] Criando treino semanal para dia ${diaValido}`);

      const { data, error } = await supabase
        .from("treinos_semanais")
        .insert({
          profile_id: profileId,
          personal_id: personalId,
          semana: semanaParaBuscar,
          dia_semana: diaValido,
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
    [personalId, profileId, treinos, semanaParaBuscar]
  );

  // Funções de navegação de semana
  const irParaSemanaAnterior = useCallback(() => {
    setSemanaSelecionada(getPreviousWeekStart(semanaSelecionada));
  }, [semanaSelecionada]);

  const irParaProximaSemana = useCallback(() => {
    setSemanaSelecionada(getNextWeekStart(semanaSelecionada));
  }, [semanaSelecionada]);

  const irParaSemanaAtual = useCallback(() => {
    setSemanaSelecionada(getWeekStart());
  }, []);

  const isSemanaAtual = isCurrentWeek(semanaSelecionada);

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
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
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
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
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
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
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
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
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
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
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
      // 🔧 PWA: Salvar localmente ANTES de tentar sincronizar
      salvarProgressoLocal(exercicioId, concluido);
      
      const { error } = await supabase
        .from("exercicios")
        .update({ concluido })
        .eq("id", exercicioId);
      
      if (error) throw error;
      
      // 🔧 PWA: Marcar como sincronizado após sucesso
      marcarSincronizado(exercicioId);
      
      return { exercicioId, concluido };
    },
    onMutate: async ({ exercicioId, concluido }) => {
      await queryClient.cancelQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      });
      const previous = queryClient.getQueryData<TreinoDia[]>(
        buildQueryKey(profileId, personalId, semanaParaBuscar)
      );
      if (previous) {
        const next = previous.map((t) => ({
          ...t,
          exercicios: t.exercicios.map((e) =>
            e.id === exercicioId ? { ...e, concluido } : e
          ),
        }));
        queryClient.setQueryData(
          buildQueryKey(profileId, personalId, semanaParaBuscar),
          next
        );
      }
      return { previous };
    },
    onError: (_err, _vars, context: any) => {
      if (context?.previous) {
        queryClient.setQueryData(
          buildQueryKey(profileId, personalId, semanaParaBuscar),
          context.previous
        );
      }
      // Não mostrar toast de erro - o progresso foi salvo localmente
      console.error("[useTreinos] Erro ao sincronizar exercício, salvo localmente");
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      });
    },
  });

  // 🆕 Mutation para criar treino adicional no mesmo dia
  const criarTreinoNoDiaMutation = useMutation({
    mutationFn: async ({
      dia,
      nomeTreino,
    }: {
      dia: number;
      nomeTreino: string;
    }) => {
      const diaValido = validarDiaSemana(dia);
      
      // Buscar quantos treinos já existem para este dia
      const treinosDoDia = treinos.filter((t) => t.dia === diaValido);
      const proximaOrdem = treinosDoDia.length > 0 
        ? Math.max(...treinosDoDia.map((t) => t.ordem_no_dia || 1)) + 1 
        : 1;

      const { data, error } = await supabase
        .from("treinos_semanais")
        .insert({
          profile_id: profileId,
          personal_id: personalId,
          semana: semanaParaBuscar,
          dia_semana: diaValido,
          nome_treino: nomeTreino,
          ordem_no_dia: proximaOrdem,
          concluido: false,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      });
      toast.success("Treino adicionado!");
    },
    onError: (err) => {
      toast.error("Erro ao criar treino");
      console.error("[useTreinos] criarTreinoNoDia error:", err);
    },
  });

  // 🆕 Mutation para renomear treino
  const renomearTreinoMutation = useMutation({
    mutationFn: async ({
      treinoId,
      nomeTreino,
    }: {
      treinoId: string;
      nomeTreino: string;
    }) => {
      const { error } = await supabase
        .from("treinos_semanais")
        .update({ nome_treino: nomeTreino })
        .eq("id", treinoId);

      if (error) throw error;
      return { treinoId, nomeTreino };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      });
      toast.success("Treino renomeado!");
    },
    onError: (err) => {
      toast.error("Erro ao renomear treino");
      console.error("[useTreinos] renomearTreino error:", err);
    },
  });

  // 🆕 Mutation para deletar treino específico
  const deletarTreinoMutation = useMutation({
    mutationFn: async (treinoId: string) => {
      // Primeiro deleta exercícios
      await supabase.from("exercicios").delete().eq("treino_semanal_id", treinoId);
      
      // Depois deleta blocos
      await supabase.from("blocos_treino").delete().eq("treino_semanal_id", treinoId);
      
      // Finalmente deleta o treino
      const { error } = await supabase
        .from("treinos_semanais")
        .delete()
        .eq("id", treinoId);

      if (error) throw error;
      return treinoId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      });
      toast.success("Treino excluído!");
    },
    onError: (err) => {
      toast.error("Erro ao excluir treino");
      console.error("[useTreinos] deletarTreino error:", err);
    },
  });

  // 🆕 Mutation para limpar TODO o conteúdo de um treino (exercícios + blocos) sem deletar o registro
  const limparTreinoDiaMutation = useMutation({
    mutationFn: async (treinoId: string) => {
      console.log(`[useTreinos] Limpando conteúdo do treino: ${treinoId}`);
      
      // Deleta todos os exercícios do treino
      const { error: errExercicios } = await supabase
        .from("exercicios")
        .delete()
        .eq("treino_semanal_id", treinoId);
      
      if (errExercicios) throw errExercicios;
      
      // Deleta todos os blocos do treino
      const { error: errBlocos } = await supabase
        .from("blocos_treino")
        .delete()
        .eq("treino_semanal_id", treinoId);
      
      if (errBlocos) throw errBlocos;
      
      return treinoId;
    },
    onSuccess: async () => {
      // Invalida queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
        }),
        queryClient.invalidateQueries({
          predicate: (query) => {
            const key = query.queryKey as string[];
            return (
              key[0] === "grupos-exercicios" ||
              key[0] === "blocos-treino"
            );
          },
        }),
      ]);
      toast.success("Treino limpo com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao limpar treino");
      console.error("[useTreinos] limparTreinoDia error:", err);
    },
  });

  // Helper para agrupar treinos por dia
  const treinosPorDia = (dia: number): TreinoDia[] => {
    return treinos.filter((t) => t.dia === dia);
  };

  return {
    treinos,
    loading,
    error,
    // Navegação de semanas
    semanaSelecionada,
    setSemanaSelecionada,
    irParaSemanaAnterior,
    irParaProximaSemana,
    irParaSemanaAtual,
    isSemanaAtual,
    semanaAtivaData,
    // Mutations
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
    // 🆕 Novos métodos para múltiplos treinos por dia
    criarTreinoNoDia: (dia: number, nomeTreino: string) =>
      criarTreinoNoDiaMutation.mutateAsync({ dia, nomeTreino }),
    renomearTreino: (treinoId: string, nomeTreino: string) =>
      renomearTreinoMutation.mutateAsync({ treinoId, nomeTreino }),
    deletarTreino: (treinoId: string) =>
      deletarTreinoMutation.mutateAsync(treinoId),
    limparTreinoDia: (treinoId: string) =>
      limparTreinoDiaMutation.mutateAsync(treinoId),
    treinosPorDia,
    refetch: () => refetch(),
    recarregar: () =>
      queryClient.invalidateQueries({
        queryKey: buildQueryKey(profileId, personalId, semanaParaBuscar),
      }),
    isAdicionando: adicionarExercicioMutation.status === "pending",
    isEditando: editarExercicioMutation.status === "pending",
    isRemovendo: removerExercicioMutation.status === "pending",
    isReordenando: reordenarExerciciosMutation.status === "pending",
    isCriandoTreino: criarTreinoNoDiaMutation.status === "pending",
    isLimpandoTreino: limparTreinoDiaMutation.status === "pending",
  };
}
