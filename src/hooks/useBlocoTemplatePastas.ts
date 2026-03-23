import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface BlocoTemplatePasta {
  id: string;
  personal_id: string;
  nome: string;
  cor: string;
  ordem: number;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  subpastas?: BlocoTemplatePasta[];
}

interface Props {
  personalId: string;
  enabled?: boolean;
}

export function useBlocoTemplatePastas({ personalId, enabled = true }: Props) {
  const queryClient = useQueryClient();
  const queryKey = ["bloco-template-pastas", personalId];

  const { data: pastas = [], isLoading: loading } = useQuery({
    queryKey,
    queryFn: async (): Promise<BlocoTemplatePasta[]> => {
      const { data, error } = await supabase
        .from("bloco_template_pastas" as any)
        .select("*")
        .eq("personal_id", personalId)
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as BlocoTemplatePasta[];
    },
    enabled: enabled && !!personalId,
    staleTime: 1000 * 60 * 5,
  });

  const organizarHierarquia = (list: BlocoTemplatePasta[]): BlocoTemplatePasta[] => {
    const map = new Map<string, BlocoTemplatePasta>();
    const raiz: BlocoTemplatePasta[] = [];
    list.forEach(p => map.set(p.id, { ...p, subpastas: [] }));
    list.forEach(p => {
      const item = map.get(p.id)!;
      if (p.parent_id && map.has(p.parent_id)) {
        map.get(p.parent_id)!.subpastas!.push(item);
      } else {
        raiz.push(item);
      }
    });
    return raiz;
  };

  const criarPastaMutation = useMutation({
    mutationFn: async (dados: { nome: string; cor?: string; parent_id?: string | null }) => {
      const siblings = pastas.filter(p => p.parent_id === (dados.parent_id || null));
      const maxOrdem = siblings.length > 0 ? Math.max(...siblings.map(p => p.ordem)) : 0;
      const { data, error } = await supabase
        .from("bloco_template_pastas" as any)
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
      queryClient.invalidateQueries({ queryKey });
      toast.success("Pasta criada!");
    },
    onError: () => toast.error("Erro ao criar pasta"),
  });

  const atualizarPastaMutation = useMutation({
    mutationFn: async ({ pastaId, dados }: { pastaId: string; dados: Partial<Pick<BlocoTemplatePasta, "nome" | "cor" | "ordem">> }) => {
      const { error } = await supabase
        .from("bloco_template_pastas" as any)
        .update(dados)
        .eq("id", pastaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success("Pasta atualizada!");
    },
    onError: () => toast.error("Erro ao atualizar pasta"),
  });

  const deletarPastaMutation = useMutation({
    mutationFn: async (pastaId: string) => {
      const { error } = await supabase
        .from("bloco_template_pastas" as any)
        .delete()
        .eq("id", pastaId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["bloco-templates", personalId] });
      toast.success("Pasta removida!");
    },
    onError: () => toast.error("Erro ao remover pasta"),
  });

  const moverTemplateMutation = useMutation({
    mutationFn: async ({ templateId, pastaId }: { templateId: string; pastaId: string | null }) => {
      const { error } = await supabase
        .from("bloco_templates" as any)
        .update({ pasta_id: pastaId })
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bloco-templates", personalId] });
      toast.success("Template movido!");
    },
    onError: () => toast.error("Erro ao mover template"),
  });

  return {
    pastas,
    pastasHierarquicas: organizarHierarquia(pastas),
    loading,
    criarPasta: (dados: { nome: string; cor?: string; parent_id?: string | null }) =>
      criarPastaMutation.mutateAsync(dados),
    atualizarPasta: (pastaId: string, dados: Partial<Pick<BlocoTemplatePasta, "nome" | "cor" | "ordem">>) =>
      atualizarPastaMutation.mutateAsync({ pastaId, dados }),
    deletarPasta: (pastaId: string) => deletarPastaMutation.mutateAsync(pastaId),
    moverTemplate: (templateId: string, pastaId: string | null) =>
      moverTemplateMutation.mutateAsync({ templateId, pastaId }),
    isCriando: criarPastaMutation.isPending,
    isDeletando: deletarPastaMutation.isPending,
  };
}
