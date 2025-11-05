import { useCallback } from "react";
import type { BlocoTreino } from "@/types/workoutBlocks";
import { supabase } from "@/integrations/supabase/client";

export function useWorkoutBlocks() {
  const criarBloco = useCallback(
    async (treinoSemanalId: string, bloco: Partial<BlocoTreino>) => {
      try {
        // Obter próxima ordem
        const { data: ultimoBloco } = await supabase
          .from("blocos_treino")
          .select("ordem")
          .eq("treino_semanal_id", treinoSemanalId)
          .eq("posicao", bloco.posicao ?? "meio")
          .is("deleted_at", null)
          .order("ordem", { ascending: false })
          .limit(1)
          .single();

        const proximaOrdem = ultimoBloco ? ultimoBloco.ordem + 1 : 1;

        // Inserir bloco
        const { data, error } = await supabase
          .from("blocos_treino")
          .insert({
            treino_semanal_id: treinoSemanalId,
            tipo: bloco.tipo,
            posicao: bloco.posicao ?? "meio",
            ordem: proximaOrdem,
            nome: bloco.nome,
            descricao: bloco.descricao,
            duracao_estimada_minutos: bloco.duracao_estimada_minutos,
            obrigatorio: bloco.obrigatorio ?? false,
            config_cardio: bloco.config_cardio,
            config_alongamento: bloco.config_alongamento,
            config_aquecimento: bloco.config_aquecimento,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } catch (error) {
        console.error("[useWorkoutBlocks] Erro ao criar:", error);
        throw error;
      }
    },
    []
  );

  const obterBlocos = useCallback(async (treinoSemanalId: string) => {
    try {
      const { data, error } = await supabase
        .from("blocos_treino")
        .select("*")
        .eq("treino_semanal_id", treinoSemanalId)
        .is("deleted_at", null)
        .order("posicao", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) throw error;
      return data as BlocoTreino[];
    } catch (error) {
      console.error("[useWorkoutBlocks] Erro ao obter:", error);
      throw error;
    }
  }, []);

  const atualizarBloco = useCallback(
    async (blocoId: string, updates: Partial<BlocoTreino>) => {
      try {
        const { error } = await supabase
          .from("blocos_treino")
          .update(updates)
          .eq("id", blocoId);

        if (error) throw error;
      } catch (error) {
        console.error("[useWorkoutBlocks] Erro ao atualizar:", error);
        throw error;
      }
    },
    []
  );

  const deletarBloco = useCallback(async (blocoId: string) => {
    try {
      const { error } = await supabase
        .from("blocos_treino")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", blocoId);

      if (error) throw error;
    } catch (error) {
      console.error("[useWorkoutBlocks] Erro ao deletar:", error);
      throw error;
    }
  }, []);

  const marcarConcluido = useCallback(
    async (blocoId: string, concluido: boolean) => {
      try {
        const { error } = await supabase
          .from("blocos_treino")
          .update({
            concluido,
            concluido_em: concluido ? new Date().toISOString() : null,
          })
          .eq("id", blocoId);

        if (error) throw error;
      } catch (error) {
        console.error("[useWorkoutBlocks] Erro ao marcar:", error);
        throw error;
      }
    },
    []
  );

  return {
    criarBloco,
    obterBlocos,
    atualizarBloco,
    deletarBloco,
    marcarConcluido,
  };
}
