// hooks/useModeloPastas.ts
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ModeloPasta {
  id: string;
  personal_id: string;
  nome: string;
  cor: string;
  ordem: number;
  created_at: string;
  updated_at: string;
  // Novos campos para hierarquia
  parent_id: string | null;
  nivel: number;
  caminho: string | null;
  // Campo calculado para UI
  subpastas?: ModeloPasta[];
}

interface UseModeloPastasProps {
  personalId: string;
  enabled?: boolean;
}

export function useModeloPastas({
  personalId,
  enabled = true,
}: UseModeloPastasProps) {
  const queryClient = useQueryClient();

  // Buscar todas as pastas do personal
  const {
    data: pastas = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["modelo-pastas", personalId],
    queryFn: async (): Promise<ModeloPasta[]> => {
      const { data, error } = await supabase
        .from("modelo_pastas")
        .select("*")
        .eq("personal_id", personalId)
        .order("ordem", { ascending: true });

      if (error) {
        console.error("[useModeloPastas] Erro ao buscar pastas:", error);
        throw error;
      }

      return data as ModeloPasta[];
    },
    enabled: enabled && !!personalId,
    staleTime: 1000 * 60 * 5,
  });

  // Criar nova pasta (agora com suporte a parent_id)
  const criarPastaMutation = useMutation({
    mutationFn: async (dados: { nome: string; cor?: string; parent_id?: string | null }) => {
      // Calcular próxima ordem baseada no parent
      const pastasDoMesmoNivel = pastas.filter(p => p.parent_id === (dados.parent_id || null));
      const maxOrdem = pastasDoMesmoNivel.length > 0 
        ? Math.max(...pastasDoMesmoNivel.map((p) => p.ordem)) 
        : 0;

      const { data, error } = await supabase
        .from("modelo_pastas")
        .insert({
          personal_id: personalId,
          nome: dados.nome,
          cor: dados.cor || "#3b82f6",
          ordem: maxOrdem + 1,
          parent_id: dados.parent_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelo-pastas", personalId] });
      toast.success("Pasta criada com sucesso!");
    },
    onError: (error: any) => {
      console.error("[useModeloPastas] Erro ao criar pasta:", error);
      toast.error("Erro ao criar pasta");
    },
  });

  // Função para organizar pastas em hierarquia
  const organizarHierarquia = (pastasList: ModeloPasta[]): ModeloPasta[] => {
    const pastasMap = new Map<string, ModeloPasta>();
    const raiz: ModeloPasta[] = [];

    // Primeiro, criar o mapa de todas as pastas
    pastasList.forEach(pasta => {
      pastasMap.set(pasta.id, { ...pasta, subpastas: [] });
    });

    // Depois, organizar a hierarquia
    pastasList.forEach(pasta => {
      const pastaComSubs = pastasMap.get(pasta.id)!;
      if (pasta.parent_id && pastasMap.has(pasta.parent_id)) {
        const parent = pastasMap.get(pasta.parent_id)!;
        parent.subpastas = parent.subpastas || [];
        parent.subpastas.push(pastaComSubs);
      } else {
        raiz.push(pastaComSubs);
      }
    });

    return raiz;
  };

  // Pastas organizadas hierarquicamente
  const pastasHierarquicas = organizarHierarquia(pastas);

  // Atualizar pasta
  const atualizarPastaMutation = useMutation({
    mutationFn: async ({
      pastaId,
      dados,
    }: {
      pastaId: string;
      dados: Partial<Pick<ModeloPasta, "nome" | "cor" | "ordem">>;
    }) => {
      const { error } = await supabase
        .from("modelo_pastas")
        .update(dados)
        .eq("id", pastaId);

      if (error) throw error;
      return { pastaId, dados };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelo-pastas", personalId] });
      toast.success("Pasta atualizada!");
    },
    onError: (error: any) => {
      console.error("[useModeloPastas] Erro ao atualizar pasta:", error);
      toast.error("Erro ao atualizar pasta");
    },
  });

  // Deletar pasta
  const deletarPastaMutation = useMutation({
    mutationFn: async (pastaId: string) => {
      // Modelos desta pasta terão pasta_id = null automaticamente (ON DELETE SET NULL)
      const { error } = await supabase
        .from("modelo_pastas")
        .delete()
        .eq("id", pastaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelo-pastas", personalId] });
      queryClient.invalidateQueries({ queryKey: ["modelos-treino", personalId] });
      toast.success("Pasta deletada!");
    },
    onError: (error: any) => {
      console.error("[useModeloPastas] Erro ao deletar pasta:", error);
      toast.error("Erro ao deletar pasta");
    },
  });

  // Mover modelo para pasta
  const moverModeloParaPastaMutation = useMutation({
    mutationFn: async ({
      modeloId,
      pastaId,
    }: {
      modeloId: string;
      pastaId: string | null;
    }) => {
      const { error } = await supabase
        .from("treino_modelos")
        .update({ pasta_id: pastaId })
        .eq("id", modeloId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["modelos-treino", personalId] });
      toast.success("Modelo movido!");
    },
    onError: (error: any) => {
      console.error("[useModeloPastas] Erro ao mover modelo:", error);
      toast.error("Erro ao mover modelo");
    },
  });

  return {
    pastas,
    pastasHierarquicas,
    loading,
    error,
    criarPasta: (dados: { nome: string; cor?: string; parent_id?: string | null }) =>
      criarPastaMutation.mutateAsync(dados),
    atualizarPasta: (
      pastaId: string,
      dados: Partial<Pick<ModeloPasta, "nome" | "cor" | "ordem">>
    ) => atualizarPastaMutation.mutateAsync({ pastaId, dados }),
    deletarPasta: (pastaId: string) => deletarPastaMutation.mutateAsync(pastaId),
    moverModeloParaPasta: (modeloId: string, pastaId: string | null) =>
      moverModeloParaPastaMutation.mutateAsync({ modeloId, pastaId }),
    organizarHierarquia,
    isCriando: criarPastaMutation.isPending,
    isAtualizando: atualizarPastaMutation.isPending,
    isDeletando: deletarPastaMutation.isPending,
    isMovendo: moverModeloParaPastaMutation.isPending,
  };
}
