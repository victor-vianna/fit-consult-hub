import { useCallback } from "react";
import type { BlocoTreino } from "@/types/workoutBlocks";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useWorkoutBlocks() {
  const criarBloco = useCallback(
    async (treinoSemanalId: string, bloco: Partial<BlocoTreino>) => {
      try {
        console.log("[useWorkoutBlocks] Criando bloco:", {
          treinoSemanalId,
          bloco,
        });

        // 🔧 FIX: Query corrigida para obter próxima ordem
        const posicaoAlvo = bloco.posicao ?? "meio";

        const { data: ultimoBloco, error: queryError } = await supabase
          .from("blocos_treino")
          .select("ordem")
          .eq("treino_semanal_id", treinoSemanalId)
          .eq("posicao", posicaoAlvo)
          .is("deleted_at", null)
          .order("ordem", { ascending: false })
          .limit(1)
          .maybeSingle(); // 🔧 FIX: Usar maybeSingle() ao invés de single()

        if (queryError) {
          console.error(
            "[useWorkoutBlocks] Erro ao buscar última ordem:",
            queryError
          );
          // Não lançar erro se for apenas "não encontrado"
          if (queryError.code !== "PGRST116") {
            throw queryError;
          }
        }

        const proximaOrdem = ultimoBloco ? ultimoBloco.ordem + 1 : 1;

        console.log(
          "[useWorkoutBlocks] Próxima ordem calculada:",
          proximaOrdem
        );

        // 🔧 FIX: Inserir bloco com estrutura correta
        const { data, error } = await supabase
          .from("blocos_treino")
          .insert({
            treino_semanal_id: treinoSemanalId,
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

        if (error) {
          console.error("[useWorkoutBlocks] Erro ao inserir bloco:", error);
          throw error;
        }

        console.log("[useWorkoutBlocks] Bloco criado com sucesso:", data);

        // ✅ Toast de sucesso
        toast.success("Bloco adicionado com sucesso");

        return data as any as BlocoTreino;
      } catch (error: any) {
        console.error("[useWorkoutBlocks] Erro ao criar:", error);

        // 🔧 FIX: Mensagem de erro mais específica
        if (error.code === "42P17") {
          toast.error(
            "Erro de permissão ao criar bloco. Verifique as políticas RLS."
          );
        } else {
          toast.error("Erro ao adicionar bloco de treino");
        }

        throw error;
      }
    },
    []
  );

  const obterBlocos = useCallback(async (treinoSemanalId: string) => {
    try {
      console.log(
        "[useWorkoutBlocks] Buscando blocos para treino:",
        treinoSemanalId
      );

      const { data, error } = await supabase
        .from("blocos_treino")
        .select("*")
        .eq("treino_semanal_id", treinoSemanalId)
        .is("deleted_at", null)
        .order("posicao", { ascending: true })
        .order("ordem", { ascending: true });

      if (error) {
        console.error("[useWorkoutBlocks] Erro ao buscar blocos:", error);
        throw error;
      }

      console.log("[useWorkoutBlocks] Blocos encontrados:", data?.length ?? 0);
      return (data ?? []) as any as BlocoTreino[];
    } catch (error) {
      console.error("[useWorkoutBlocks] Erro ao obter:", error);
      toast.error("Erro ao carregar blocos de treino");
      throw error;
    }
  }, []);

  const atualizarBloco = useCallback(
    async (blocoId: string, updates: Partial<BlocoTreino>) => {
      try {
        console.log("[useWorkoutBlocks] Atualizando bloco:", {
          blocoId,
          updates,
        });

        const { error } = await supabase
          .from("blocos_treino")
          .update(updates as any)
          .eq("id", blocoId);

        if (error) {
          console.error("[useWorkoutBlocks] Erro ao atualizar:", error);
          throw error;
        }

        console.log("[useWorkoutBlocks] Bloco atualizado com sucesso");
        toast.success("Bloco atualizado com sucesso");
      } catch (error: any) {
        console.error("[useWorkoutBlocks] Erro ao atualizar:", error);

        if (error.code === "42P17") {
          toast.error(
            "Erro de permissão ao atualizar bloco. Verifique as políticas RLS."
          );
        } else {
          toast.error("Erro ao atualizar bloco");
        }

        throw error;
      }
    },
    []
  );

  const deletarBloco = useCallback(async (blocoId: string) => {
    try {
      console.log("[useWorkoutBlocks] Deletando bloco:", blocoId);

      // 🔧 FIX: Usar DELETE real ao invés de soft delete
      // Isso evita problemas com RLS recursivo
      const { error } = await supabase
        .from("blocos_treino")
        .delete()
        .eq("id", blocoId);

      if (error) {
        console.error("[useWorkoutBlocks] Erro ao deletar:", error);
        throw error;
      }

      console.log("[useWorkoutBlocks] Bloco deletado com sucesso");
      toast.success("Bloco removido com sucesso");
    } catch (error: any) {
      console.error("[useWorkoutBlocks] Erro ao deletar:", error);

      // 🔧 FIX: Tratamento específico para erro RLS
      if (error.code === "42P17") {
        toast.error(
          "Erro de recursão ao deletar bloco. Verifique as políticas RLS no Supabase."
        );
      } else if (error.code === "23503") {
        toast.error("Não é possível deletar: bloco possui dependências.");
      } else {
        toast.error("Erro ao remover bloco");
      }

      throw error;
    }
  }, []);

  const marcarConcluido = useCallback(
    async (blocoId: string, concluido: boolean) => {
      try {
        console.log(
          "[useWorkoutBlocks] Marcando bloco como",
          concluido ? "concluído" : "não concluído"
        );

        const { error } = await supabase
          .from("blocos_treino")
          .update({
            concluido,
            concluido_em: concluido ? new Date().toISOString() : null,
          })
          .eq("id", blocoId);

        if (error) {
          console.error("[useWorkoutBlocks] Erro ao marcar:", error);
          throw error;
        }

        console.log("[useWorkoutBlocks] Status atualizado com sucesso");
        toast.success(
          concluido ? "Bloco marcado como concluído" : "Bloco desmarcado"
        );
      } catch (error: any) {
        console.error("[useWorkoutBlocks] Erro ao marcar:", error);

        if (error.code === "42P17") {
          toast.error(
            "Erro de permissão ao atualizar status. Verifique as políticas RLS."
          );
        } else {
          toast.error("Erro ao atualizar status do bloco");
        }

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
