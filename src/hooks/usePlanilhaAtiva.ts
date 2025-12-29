import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays, parseISO, format } from "date-fns";

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

      const { data, error } = await supabase
        .from("planilhas_treino")
        .insert({
          profile_id: dados.profileId,
          personal_id: dados.personalId,
          nome: dados.nome || "Planilha de Treino",
          duracao_semanas: dados.duracaoSemanas || 4,
          data_inicio: dados.dataInicio || format(new Date(), "yyyy-MM-dd"),
          observacoes: dados.observacoes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planilha-ativa"] });
      queryClient.invalidateQueries({ queryKey: ["planilhas-historico"] });
      toast.success("Planilha criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar planilha:", error);
      toast.error("Erro ao criar planilha");
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

      // Marcar planilha atual como renovada
      await supabase
        .from("planilhas_treino")
        .update({ status: "renovada" })
        .eq("id", planilha.id);

      // Criar nova planilha
      const { data, error } = await supabase
        .from("planilhas_treino")
        .insert({
          profile_id: planilha.profile_id,
          personal_id: planilha.personal_id,
          nome: dados.nome || planilha.nome,
          duracao_semanas: dados.duracaoSemanas || planilha.duracao_semanas,
          data_inicio: format(new Date(), "yyyy-MM-dd"),
          observacoes: dados.observacoes,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planilha-ativa"] });
      queryClient.invalidateQueries({ queryKey: ["planilhas-historico"] });
      toast.success("Planilha renovada com sucesso!");
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
    isCriando: criarPlanilhaMutation.isPending,
    isRenovando: renovarPlanilhaMutation.isPending,
    isEncerrando: encerrarPlanilhaMutation.isPending,
  };
}
