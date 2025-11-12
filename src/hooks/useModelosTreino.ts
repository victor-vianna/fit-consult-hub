// hooks/useModelosTreino.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModeloTreinoExercicio {
  id?: string;
  nome: string;
  link_video?: string | null;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: string | null;
  observacoes?: string | null;
  ordem: number;
  grupo_id?: string | null;
  tipo_agrupamento?: string | null;
  ordem_no_grupo?: number | null;
  descanso_entre_grupos?: number | null;
}

export interface ModeloTreinoBloco {
  id?: string;
  tipo: "cardio" | "alongamento" | "mobilidade" | "aquecimento" | "core";
  nome: string;
  duracao_minutos?: number | null;
  intensidade?: "baixa" | "moderada" | "alta" | null;
  observacoes?: string | null;
  posicao: "inicio" | "meio" | "fim";
  ordem: number;
}

export interface ModeloTreino {
  id: string;
  personal_id: string;
  nome: string;
  descricao?: string | null;
  categoria?: string | null;
  created_at: string;
  updated_at: string;
  exercicios?: ModeloTreinoExercicio[];
  blocos?: ModeloTreinoBloco[];
}

export interface CriarModeloInput {
  nome: string;
  descricao?: string;
  categoria?: string;
  exercicios: ModeloTreinoExercicio[];
  blocos?: ModeloTreinoBloco[];
}

interface UseModelosTreinoProps {
  personalId: string;
  enabled?: boolean;
}

export function useModelosTreino({
  personalId,
  enabled = true,
}: UseModelosTreinoProps) {
  const queryClient = useQueryClient();

  // 🔍 Buscar todos os modelos do personal
  const {
    data: modelos = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["modelos-treino", personalId],
    queryFn: async (): Promise<ModeloTreino[]> => {
      console.log(
        "[useModelosTreino] Buscando modelos do personal:",
        personalId
      );

      const { data: modelosData, error: modelosError } = await supabase
        .from("treino_modelos")
        .select("*")
        .eq("personal_id", personalId)
        .order("created_at", { ascending: false });

      if (modelosError) {
        console.error(
          "[useModelosTreino] Erro ao buscar modelos:",
          modelosError
        );
        throw modelosError;
      }

      // Buscar exercícios e blocos de cada modelo
      const modelosCompletos = await Promise.all(
        (modelosData || []).map(async (modelo) => {
          const [exerciciosData, blocosData] = await Promise.all([
            supabase
              .from("treino_modelo_exercicios")
              .select("*")
              .eq("modelo_id", modelo.id)
              .order("ordem"),
            supabase
              .from("treino_modelo_blocos")
              .select("*")
              .eq("modelo_id", modelo.id)
              .order("ordem"),
          ]);

          // Converte tipo dos blocos de string genérica -> tipo limitado
          const blocosTipados: ModeloTreinoBloco[] = (
            blocosData.data || []
          ).map((b) => ({
            ...b,
            tipo: b.tipo as ModeloTreinoBloco["tipo"],
            posicao: b.posicao as ModeloTreinoBloco["posicao"],
            intensidade: b.intensidade as
              | ModeloTreinoBloco["intensidade"]
              | null,
          }));

          return {
            ...modelo,
            exercicios: exerciciosData.data || [],
            blocos: blocosTipados,
          } as ModeloTreino;
        })
      );

      console.log(
        "[useModelosTreino] Modelos carregados:",
        modelosCompletos.length
      );
      return modelosCompletos;
    },
    enabled: enabled && !!personalId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  });

  // ➕ Criar novo modelo
  const criarModeloMutation = useMutation({
    mutationFn: async (input: CriarModeloInput) => {
      console.log("[useModelosTreino] Criando novo modelo:", input.nome);

      // 1. Criar o modelo
      const { data: modeloData, error: modeloError } = await supabase
        .from("treino_modelos")
        .insert({
          personal_id: personalId,
          nome: input.nome,
          descricao: input.descricao || null,
          categoria: input.categoria || null,
        })
        .select()
        .single();

      if (modeloError) throw modeloError;

      console.log("[useModelosTreino] Modelo criado:", modeloData.id);

      // 2. Inserir exercícios
      if (input.exercicios.length > 0) {
        const exerciciosInsert = input.exercicios.map((ex, index) => ({
          modelo_id: modeloData.id,
          nome: ex.nome,
          link_video: ex.link_video || null,
          series: ex.series,
          repeticoes: ex.repeticoes,
          descanso: ex.descanso,
          carga: ex.carga || null,
          observacoes: ex.observacoes || null,
          ordem: ex.ordem ?? index,
          grupo_id: ex.grupo_id || null,
          tipo_agrupamento: ex.tipo_agrupamento || null,
          ordem_no_grupo: ex.ordem_no_grupo || null,
          descanso_entre_grupos: ex.descanso_entre_grupos || null,
        }));

        const { error: exerciciosError } = await supabase
          .from("treino_modelo_exercicios")
          .insert(exerciciosInsert);

        if (exerciciosError) {
          console.error(
            "[useModelosTreino] Erro ao inserir exercícios:",
            exerciciosError
          );
          throw exerciciosError;
        }

        console.log(
          "[useModelosTreino] Exercícios inseridos:",
          exerciciosInsert.length
        );
      }

      // 3. Inserir blocos (se houver)
      if (input.blocos && input.blocos.length > 0) {
        const blocosInsert = input.blocos.map((bloco, index) => ({
          modelo_id: modeloData.id,
          tipo: bloco.tipo,
          nome: bloco.nome,
          duracao_minutos: bloco.duracao_minutos || null,
          intensidade: bloco.intensidade || null,
          observacoes: bloco.observacoes || null,
          posicao: bloco.posicao,
          ordem: bloco.ordem ?? index,
        }));

        const { error: blocosError } = await supabase
          .from("treino_modelo_blocos")
          .insert(blocosInsert);

        if (blocosError) {
          console.error(
            "[useModelosTreino] Erro ao inserir blocos:",
            blocosError
          );
          throw blocosError;
        }

        console.log(
          "[useModelosTreino] Blocos inseridos:",
          blocosInsert.length
        );
      }

      return modeloData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["modelos-treino", personalId],
      });
      toast.success("Modelo criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("[useModelosTreino] Erro ao criar modelo:", error);
      toast.error("Erro ao criar modelo de treino");
    },
  });

  // 🗑️ Deletar modelo
  const deletarModeloMutation = useMutation({
    mutationFn: async (modeloId: string): Promise<void> => {
      console.log("[useModelosTreino] Deletando modelo:", modeloId);

      const { error } = await supabase
        .from("treino_modelos")
        .delete()
        .eq("id", modeloId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["modelos-treino", personalId],
      });
      toast.success("Modelo deletado com sucesso");
    },
    onError: (error: any) => {
      console.error("[useModelosTreino] Erro ao deletar modelo:", error);
      toast.error("Erro ao deletar modelo");
    },
  });

  // ✏️ Atualizar modelo (nome, descrição, categoria)
  const atualizarModeloMutation = useMutation({
    mutationFn: async ({
      modeloId,
      dados,
    }: {
      modeloId: string;
      dados: Partial<Pick<ModeloTreino, "nome" | "descricao" | "categoria">>;
    }) => {
      console.log("[useModelosTreino] Atualizando modelo:", modeloId);

      const { error } = await supabase
        .from("treino_modelos")
        .update(dados)
        .eq("id", modeloId);

      if (error) throw error;

      return { modeloId, dados };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["modelos-treino", personalId],
      });
      toast.success("Modelo atualizado com sucesso");
    },
    onError: (error: any) => {
      console.error("[useModelosTreino] Erro ao atualizar modelo:", error);
      toast.error("Erro ao atualizar modelo");
    },
  });

  return {
    modelos,
    loading,
    error,
    criarModelo: (input: CriarModeloInput) =>
      criarModeloMutation.mutateAsync(input),
    deletarModelo: (modeloId: string): Promise<void> =>
      deletarModeloMutation.mutateAsync(modeloId),
    atualizarModelo: (
      modeloId: string,
      dados: Partial<Pick<ModeloTreino, "nome" | "descricao" | "categoria">>
    ) => atualizarModeloMutation.mutateAsync({ modeloId, dados }),
    isCriando: criarModeloMutation.isPending,
    isDeletando: deletarModeloMutation.isPending,
    isAtualizando: atualizarModeloMutation.isPending,
  };
}
