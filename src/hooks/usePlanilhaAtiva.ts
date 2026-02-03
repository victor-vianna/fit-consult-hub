import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays, parseISO, format, addWeeks } from "date-fns";
import { getPreviousWeekStart, getWeekStart } from "@/utils/weekUtils";

interface Planilha {
  id: string;
  profile_id: string;
  personal_id: string;
  nome: string;
  data_inicio: string;
  duracao_semanas: number;
  data_prevista_fim: string;
  status: "ativa" | "encerrada" | "renovada";
  observacoes: string | null;
  created_at: string;
  updated_at: string;
}

interface UsePlanilhaAtivaParams {
  profileId?: string;
  personalId?: string;
}

// Função helper para gerar UUID v4
const generateUUID = (): string => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export function usePlanilhaAtiva({ profileId, personalId }: UsePlanilhaAtivaParams) {
  const queryClient = useQueryClient();

  // Buscar planilha ativa
  const { data: planilha, isLoading: loading } = useQuery({
    queryKey: ["planilha-ativa", profileId, personalId],
    queryFn: async () => {
      if (!profileId) return null;

      let query = supabase
        .from("planilhas_treino")
        .select("*")
        .eq("profile_id", profileId)
        .eq("status", "ativa")
        .order("created_at", { ascending: false })
        .limit(1);

      if (personalId) {
        query = query.eq("personal_id", personalId);
      }

      const { data, error } = await query.single();

      if (error && error.code !== "PGRST116") {
        console.error("Erro ao buscar planilha:", error);
        return null;
      }

      return data as Planilha | null;
    },
    enabled: !!profileId,
  });

  // Buscar histórico de planilhas
  const { data: historico = [] } = useQuery({
    queryKey: ["planilhas-historico", profileId],
    queryFn: async () => {
      if (!profileId) return [];

      const { data, error } = await supabase
        .from("planilhas_treino")
        .select("*")
        .eq("profile_id", profileId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao buscar histórico:", error);
        return [];
      }

      return data as Planilha[];
    },
    enabled: !!profileId,
  });

  // Cálculos derivados
  const diasRestantes = useMemo(() => {
    if (!planilha?.data_prevista_fim) return 0;
    const hoje = new Date();
    const fim = parseISO(planilha.data_prevista_fim);
    const diff = differenceInDays(fim, hoje);
    return Math.max(0, diff);
  }, [planilha?.data_prevista_fim]);

  const diasTotais = useMemo(() => {
    if (!planilha) return 0;
    return planilha.duracao_semanas * 7;
  }, [planilha?.duracao_semanas]);

  const diasDecorridos = useMemo(() => {
    if (!planilha?.data_inicio) return 0;
    const hoje = new Date();
    const inicio = parseISO(planilha.data_inicio);
    const diff = differenceInDays(hoje, inicio);
    return Math.max(0, Math.min(diff, diasTotais));
  }, [planilha?.data_inicio, diasTotais]);

  const percentualConcluido = useMemo(() => {
    if (diasTotais === 0) return 0;
    return Math.min(100, Math.round((diasDecorridos / diasTotais) * 100));
  }, [diasDecorridos, diasTotais]);

  const status = useMemo(() => {
    if (!planilha) return "sem_planilha";
    if (diasRestantes <= 0) return "expirada";
    if (diasRestantes <= 3) return "critica";
    if (diasRestantes <= 7) return "expirando";
    return "ativa";
  }, [planilha, diasRestantes]);

  /**
   * Replica os treinos da semana base para as demais semanas da planilha
   */
  const replicarTreinosParaSemanasRestantes = async (
    profileId: string,
    personalId: string,
    semanaBase: string,
    duracaoSemanas: number
  ) => {
    console.log("[usePlanilhaAtiva] Replicando treinos da semana base:", semanaBase);

    // Buscar treinos da semana base
    const { data: treinosBase, error: treinosError } = await supabase
      .from("treinos_semanais")
      .select("*")
      .eq("profile_id", profileId)
      .eq("personal_id", personalId)
      .eq("semana", semanaBase);

    if (treinosError) {
      console.error("Erro ao buscar treinos base:", treinosError);
      return;
    }

    if (!treinosBase || treinosBase.length === 0) {
      console.log("[usePlanilhaAtiva] Nenhum treino na semana base para replicar");
      return;
    }

    console.log(`[usePlanilhaAtiva] Encontrados ${treinosBase.length} treinos para replicar`);

    // Para cada semana restante (semana 2 até a última)
    for (let semanaIdx = 1; semanaIdx < duracaoSemanas; semanaIdx++) {
      const dataBase = parseISO(semanaBase);
      const dataSemana = addWeeks(dataBase, semanaIdx);
      const semanaStr = format(dataSemana, "yyyy-MM-dd");

      console.log(`[usePlanilhaAtiva] Replicando para semana ${semanaIdx + 1}: ${semanaStr}`);

      // Para cada treino da semana base
      for (const treinoBase of treinosBase) {
        // Verificar se já existe treino nesta semana/dia
        const { data: treinoExistente } = await supabase
          .from("treinos_semanais")
          .select("id")
          .eq("profile_id", profileId)
          .eq("personal_id", personalId)
          .eq("semana", semanaStr)
          .eq("dia_semana", treinoBase.dia_semana)
          .maybeSingle();

        let treinoId: string;

        if (treinoExistente) {
          // Atualizar treino existente
          await supabase
            .from("treinos_semanais")
            .update({
              modelo_id: treinoBase.modelo_id,
              nome_modelo: treinoBase.nome_modelo,
              descricao: treinoBase.descricao,
            })
            .eq("id", treinoExistente.id);

          // Limpar exercícios e blocos antigos
          await Promise.all([
            supabase.from("exercicios").delete().eq("treino_semanal_id", treinoExistente.id),
            supabase.from("blocos_treino").delete().eq("treino_semanal_id", treinoExistente.id),
          ]);

          treinoId = treinoExistente.id;
        } else {
          // Criar novo treino
          const { data: novoTreino, error: createError } = await supabase
            .from("treinos_semanais")
            .insert({
              profile_id: profileId,
              personal_id: personalId,
              semana: semanaStr,
              dia_semana: treinoBase.dia_semana,
              modelo_id: treinoBase.modelo_id,
              nome_modelo: treinoBase.nome_modelo,
              descricao: treinoBase.descricao,
              concluido: false,
            })
            .select()
            .single();

          if (createError) {
            console.error("Erro ao criar treino:", createError);
            continue;
          }

          treinoId = novoTreino.id;
        }

        // Buscar exercícios do treino base
        const { data: exerciciosBase } = await supabase
          .from("exercicios")
          .select("*")
          .eq("treino_semanal_id", treinoBase.id)
          .is("deleted_at", null)
          .order("ordem");

        if (exerciciosBase && exerciciosBase.length > 0) {
          // Mapear grupos antigos para novos UUIDs
          const grupoIdMap = new Map<string, string>();

          const exerciciosInsert = exerciciosBase.map((ex: any) => {
            let novoGrupoId = ex.grupo_id;

            if (ex.grupo_id && !grupoIdMap.has(ex.grupo_id)) {
              novoGrupoId = generateUUID();
              grupoIdMap.set(ex.grupo_id, novoGrupoId);
            } else if (ex.grupo_id) {
              novoGrupoId = grupoIdMap.get(ex.grupo_id) || ex.grupo_id;
            }

            return {
              treino_semanal_id: treinoId,
              nome: ex.nome,
              link_video: ex.link_video,
              series: ex.series,
              repeticoes: ex.repeticoes,
              descanso: ex.descanso,
              carga: ex.carga,
              observacoes: ex.observacoes,
              ordem: ex.ordem,
              grupo_id: novoGrupoId,
              tipo_agrupamento: ex.tipo_agrupamento,
              ordem_no_grupo: ex.ordem_no_grupo,
              descanso_entre_grupos: ex.descanso_entre_grupos,
              concluido: false,
            };
          });

          await supabase.from("exercicios").insert(exerciciosInsert);
        }

        // Buscar blocos do treino base
        const { data: blocosBase } = await supabase
          .from("blocos_treino")
          .select("*")
          .eq("treino_semanal_id", treinoBase.id)
          .is("deleted_at", null)
          .order("ordem");

        if (blocosBase && blocosBase.length > 0) {
          const blocosInsert = blocosBase.map((bloco: any) => ({
            treino_semanal_id: treinoId,
            tipo: bloco.tipo,
            nome: bloco.nome,
            duracao_estimada_minutos: bloco.duracao_estimada_minutos,
            descricao: bloco.descricao,
            posicao: bloco.posicao,
            ordem: bloco.ordem,
            obrigatorio: bloco.obrigatorio ?? false,
            // ✅ CORREÇÃO: Incluir todos os campos de configuração dos blocos
            config_cardio: bloco.config_cardio ?? null,
            config_alongamento: bloco.config_alongamento ?? null,
            config_aquecimento: bloco.config_aquecimento ?? null,
            config_outro: bloco.config_outro ?? null,
            concluido: false,
          }));

          await supabase.from("blocos_treino").insert(blocosInsert);
        }
      }
    }

    console.log("[usePlanilhaAtiva] Replicação concluída!");
  };

  // Criar nova planilha
  const criarPlanilhaMutation = useMutation({
    mutationFn: async (dados: {
      profileId: string;
      personalId: string;
      nome?: string;
      duracaoSemanas?: number;
      dataInicio?: string;
      observacoes?: string;
    }) => {
      // Encerrar planilhas ativas anteriores
      await supabase
        .from("planilhas_treino")
        .update({ status: "encerrada" })
        .eq("profile_id", dados.profileId)
        .eq("status", "ativa");

      const dataInicio = dados.dataInicio || format(new Date(), "yyyy-MM-dd");
      const duracaoSemanas = dados.duracaoSemanas || 4;

      const { data, error } = await supabase
        .from("planilhas_treino")
        .insert({
          profile_id: dados.profileId,
          personal_id: dados.personalId,
          nome: dados.nome || "Planilha de Treino",
          duracao_semanas: duracaoSemanas,
          data_inicio: dataInicio,
          observacoes: dados.observacoes,
        })
        .select()
        .single();

      if (error) throw error;

      // Replicar treinos da semana atual para as demais semanas
      const semanaBase = getWeekStart(parseISO(dataInicio));
      await replicarTreinosParaSemanasRestantes(
        dados.profileId,
        dados.personalId,
        semanaBase,
        duracaoSemanas
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planilha-ativa"] });
      queryClient.invalidateQueries({ queryKey: ["planilhas-historico"] });
      queryClient.invalidateQueries({ queryKey: ["treinos"] });
      toast.success("Planilha criada e treinos replicados com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar planilha:", error);
      toast.error("Erro ao criar planilha");
    },
  });

  /**
   * Copia os treinos de uma semana para outra (usado na renovação)
   */
  const copiarTreinosDeSemana = async (
    profileId: string,
    personalId: string,
    semanaOrigem: string,
    semanaDestino: string
  ) => {
    console.log(`[usePlanilhaAtiva] Copiando treinos de ${semanaOrigem} para ${semanaDestino}`);

    // Buscar treinos da semana origem
    const { data: treinosOrigem, error: treinosError } = await supabase
      .from("treinos_semanais")
      .select("*")
      .eq("profile_id", profileId)
      .eq("personal_id", personalId)
      .eq("semana", semanaOrigem);

    if (treinosError) {
      console.error("Erro ao buscar treinos origem:", treinosError);
      return;
    }

    if (!treinosOrigem || treinosOrigem.length === 0) {
      console.log("[usePlanilhaAtiva] Nenhum treino na semana origem para copiar");
      return;
    }

    console.log(`[usePlanilhaAtiva] Encontrados ${treinosOrigem.length} treinos para copiar`);

    for (const treinoOrigem of treinosOrigem) {
      // Verificar se já existe treino nesta semana/dia
      const { data: treinoExistente } = await supabase
        .from("treinos_semanais")
        .select("id")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .eq("semana", semanaDestino)
        .eq("dia_semana", treinoOrigem.dia_semana)
        .maybeSingle();

      let treinoId: string;

      if (treinoExistente) {
        // Limpar exercícios e blocos antigos
        await Promise.all([
          supabase.from("exercicios").delete().eq("treino_semanal_id", treinoExistente.id),
          supabase.from("blocos_treino").delete().eq("treino_semanal_id", treinoExistente.id),
        ]);
        treinoId = treinoExistente.id;

        // Atualizar dados do treino
        await supabase
          .from("treinos_semanais")
          .update({
            modelo_id: treinoOrigem.modelo_id,
            nome_modelo: treinoOrigem.nome_modelo,
            descricao: treinoOrigem.descricao,
            concluido: false,
          })
          .eq("id", treinoExistente.id);
      } else {
        // Criar novo treino
        const { data: novoTreino, error: createError } = await supabase
          .from("treinos_semanais")
          .insert({
            profile_id: profileId,
            personal_id: personalId,
            semana: semanaDestino,
            dia_semana: treinoOrigem.dia_semana,
            modelo_id: treinoOrigem.modelo_id,
            nome_modelo: treinoOrigem.nome_modelo,
            descricao: treinoOrigem.descricao,
            concluido: false,
          })
          .select()
          .single();

        if (createError) {
          console.error("Erro ao criar treino:", createError);
          continue;
        }

        treinoId = novoTreino.id;
      }

      // Copiar exercícios
      const { data: exerciciosOrigem } = await supabase
        .from("exercicios")
        .select("*")
        .eq("treino_semanal_id", treinoOrigem.id)
        .is("deleted_at", null)
        .order("ordem");

      if (exerciciosOrigem && exerciciosOrigem.length > 0) {
        const grupoIdMap = new Map<string, string>();

        const exerciciosInsert = exerciciosOrigem.map((ex: any) => {
          let novoGrupoId = ex.grupo_id;

          if (ex.grupo_id && !grupoIdMap.has(ex.grupo_id)) {
            novoGrupoId = generateUUID();
            grupoIdMap.set(ex.grupo_id, novoGrupoId);
          } else if (ex.grupo_id) {
            novoGrupoId = grupoIdMap.get(ex.grupo_id) || ex.grupo_id;
          }

          return {
            treino_semanal_id: treinoId,
            nome: ex.nome,
            link_video: ex.link_video,
            series: ex.series,
            repeticoes: ex.repeticoes,
            descanso: ex.descanso,
            carga: ex.carga,
            observacoes: ex.observacoes,
            ordem: ex.ordem,
            grupo_id: novoGrupoId,
            tipo_agrupamento: ex.tipo_agrupamento,
            ordem_no_grupo: ex.ordem_no_grupo,
            descanso_entre_grupos: ex.descanso_entre_grupos,
            exercise_library_id: ex.exercise_library_id,
            concluido: false,
          };
        });

        await supabase.from("exercicios").insert(exerciciosInsert);
      }

      // Copiar blocos
      const { data: blocosOrigem } = await supabase
        .from("blocos_treino")
        .select("*")
        .eq("treino_semanal_id", treinoOrigem.id)
        .is("deleted_at", null)
        .order("ordem");

      if (blocosOrigem && blocosOrigem.length > 0) {
        const blocosInsert = blocosOrigem.map((bloco: any) => ({
          treino_semanal_id: treinoId,
          tipo: bloco.tipo,
          nome: bloco.nome,
          duracao_estimada_minutos: bloco.duracao_estimada_minutos,
          descricao: bloco.descricao,
          posicao: bloco.posicao,
          ordem: bloco.ordem,
          obrigatorio: bloco.obrigatorio ?? false,
          config_cardio: bloco.config_cardio ?? null,
          config_alongamento: bloco.config_alongamento ?? null,
          config_aquecimento: bloco.config_aquecimento ?? null,
          config_outro: bloco.config_outro ?? null,
          concluido: false,
        }));

        await supabase.from("blocos_treino").insert(blocosInsert);
      }
    }

    console.log("[usePlanilhaAtiva] Cópia concluída!");
  };

  /**
   * Importa (copia) o treino completo da última semana para a semana atual.
   * Útil quando a renovação criou uma planilha nova mas a semana atual ficou vazia.
   */
  const importarTreinosDaUltimaSemanaMutation = useMutation({
    mutationFn: async () => {
      if (!planilha || !profileId || !personalId) throw new Error("Dados insuficientes");

      const semanaAtual = getWeekStart(new Date());

      // Preferência: última semana que possui treinos no banco
      const { data: ultimosTreinos, error } = await supabase
        .from("treinos_semanais")
        .select("semana")
        .eq("profile_id", profileId)
        .eq("personal_id", personalId)
        .order("semana", { ascending: false })
        .limit(1);

      if (error) throw error;

      const semanaOrigem = ultimosTreinos?.[0]?.semana || getPreviousWeekStart(semanaAtual);

      if (semanaOrigem === semanaAtual) {
        // Se por algum motivo a última semana encontrada for a mesma, força semana anterior
        await copiarTreinosDeSemana(profileId, personalId, getPreviousWeekStart(semanaAtual), semanaAtual);
        return;
      }

      await copiarTreinosDeSemana(profileId, personalId, semanaOrigem, semanaAtual);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treinos"] });
      toast.success("Treino importado da última semana com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao importar treino da última semana:", error);
      toast.error("Erro ao importar treino da última semana");
    },
  });

  // Renovar planilha
  const renovarPlanilhaMutation = useMutation({
    mutationFn: async (dados: {
      nome?: string;
      duracaoSemanas?: number;
      observacoes?: string;
    }) => {
      if (!planilha) throw new Error("Sem planilha ativa");

      // ✅ Buscar a última semana com treinos da planilha antiga
      const { data: ultimosTreinos } = await supabase
        .from("treinos_semanais")
        .select("semana")
        .eq("profile_id", planilha.profile_id)
        .eq("personal_id", planilha.personal_id)
        .order("semana", { ascending: false })
        .limit(1);

      const semanaOrigemTreinos = ultimosTreinos?.[0]?.semana || getWeekStart(parseISO(planilha.data_inicio));
      console.log("[usePlanilhaAtiva] Semana origem para renovação:", semanaOrigemTreinos);

      // Marcar planilha atual como renovada
      await supabase
        .from("planilhas_treino")
        .update({ status: "renovada" })
        .eq("id", planilha.id);

      const dataInicio = format(new Date(), "yyyy-MM-dd");
      const duracaoSemanas = dados.duracaoSemanas || planilha.duracao_semanas;

      // Criar nova planilha
      const { data, error } = await supabase
        .from("planilhas_treino")
        .insert({
          profile_id: planilha.profile_id,
          personal_id: planilha.personal_id,
          nome: dados.nome || planilha.nome,
          duracao_semanas: duracaoSemanas,
          data_inicio: dataInicio,
          observacoes: dados.observacoes,
        })
        .select()
        .single();

      if (error) throw error;

      // ✅ Copiar treinos da última semana da planilha antiga para a nova semana atual
      const semanaAtual = getWeekStart(new Date());
      await copiarTreinosDeSemana(
        planilha.profile_id,
        planilha.personal_id,
        semanaOrigemTreinos,
        semanaAtual
      );

      // Replicar para as demais semanas da nova planilha
      await replicarTreinosParaSemanasRestantes(
        planilha.profile_id,
        planilha.personal_id,
        semanaAtual,
        duracaoSemanas
      );

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planilha-ativa"] });
      queryClient.invalidateQueries({ queryKey: ["planilhas-historico"] });
      queryClient.invalidateQueries({ queryKey: ["treinos"] });
      toast.success("Planilha renovada e treinos copiados com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao renovar planilha:", error);
      toast.error("Erro ao renovar planilha");
    },
  });

  // Encerrar planilha
  const encerrarPlanilhaMutation = useMutation({
    mutationFn: async () => {
      if (!planilha) throw new Error("Sem planilha ativa");

      const { error } = await supabase
        .from("planilhas_treino")
        .update({ status: "encerrada" })
        .eq("id", planilha.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planilha-ativa"] });
      queryClient.invalidateQueries({ queryKey: ["planilhas-historico"] });
      toast.success("Planilha encerrada");
    },
    onError: (error) => {
      console.error("Erro ao encerrar planilha:", error);
      toast.error("Erro ao encerrar planilha");
    },
  });

  // Sincronizar treinos (replicar semana base para demais semanas)
  const sincronizarTreinosMutation = useMutation({
    mutationFn: async () => {
      if (!planilha || !profileId || !personalId) throw new Error("Dados insuficientes");

      const semanaBase = getWeekStart(new Date());
      await replicarTreinosParaSemanasRestantes(
        planilha.profile_id,
        planilha.personal_id,
        semanaBase,
        planilha.duracao_semanas
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["treinos"] });
      toast.success("Treinos sincronizados com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao sincronizar treinos:", error);
      toast.error("Erro ao sincronizar treinos");
    },
  });

  return {
    planilha,
    historico,
    loading,
    diasRestantes,
    diasTotais,
    diasDecorridos,
    percentualConcluido,
    status,
    criarPlanilha: criarPlanilhaMutation.mutate,
    renovarPlanilha: renovarPlanilhaMutation.mutate,
    encerrarPlanilha: encerrarPlanilhaMutation.mutate,
    sincronizarTreinos: sincronizarTreinosMutation.mutate,
    importarTreinosUltimaSemana: importarTreinosDaUltimaSemanaMutation.mutate,
    isCriando: criarPlanilhaMutation.isPending,
    isRenovando: renovarPlanilhaMutation.isPending,
    isEncerrando: encerrarPlanilhaMutation.isPending,
    isSincronizando: sincronizarTreinosMutation.isPending,
    isImportandoUltimaSemana: importarTreinosDaUltimaSemanaMutation.isPending,
  };
}
