import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BlocoTreino } from "@/types/workoutBlocks";

export interface BlocoTemplate {
  id: string;
  personal_id: string;
  nome: string;
  tipo: string;
  posicao: string;
  duracao_estimada_minutos: number | null;
  descricao: string | null;
  config_cardio: any;
  config_alongamento: any;
  config_aquecimento: any;
  config_outro: any;
  created_at: string;
}

export interface CriarBlocoTemplateInput {
  nome: string;
  tipo: string;
  posicao: string;
  duracao_estimada_minutos?: number | null;
  descricao?: string | null;
  config_cardio?: any;
  config_alongamento?: any;
  config_aquecimento?: any;
  config_outro?: any;
}

interface UseBlocoTemplatesProps {
  personalId: string;
  enabled?: boolean;
}

export function useBlocoTemplates({
  personalId,
  enabled = true,
}: UseBlocoTemplatesProps) {
  const queryClient = useQueryClient();

  const {
    data: templates = [],
    isLoading: loading,
    error,
  } = useQuery({
    queryKey: ["bloco-templates", personalId],
    queryFn: async (): Promise<BlocoTemplate[]> => {
      const { data, error } = await supabase
        .from("bloco_templates" as any)
        .select("*")
        .eq("personal_id", personalId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as BlocoTemplate[];
    },
    enabled: enabled && !!personalId,
    staleTime: 1000 * 60 * 5,
  });

  const criarTemplateMutation = useMutation({
    mutationFn: async (input: CriarBlocoTemplateInput) => {
      const { data, error } = await supabase
        .from("bloco_templates" as any)
        .insert({
          personal_id: personalId,
          nome: input.nome,
          tipo: input.tipo,
          posicao: input.posicao,
          duracao_estimada_minutos: input.duracao_estimada_minutos || null,
          descricao: input.descricao || null,
          config_cardio: input.config_cardio || null,
          config_alongamento: input.config_alongamento || null,
          config_aquecimento: input.config_aquecimento || null,
          config_outro: input.config_outro || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as unknown as BlocoTemplate;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bloco-templates", personalId],
      });
      toast.success("Template de bloco salvo com sucesso!");
    },
    onError: (error: any) => {
      console.error("Erro ao criar template:", error);
      toast.error("Erro ao salvar template de bloco");
    },
  });

  const deletarTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase
        .from("bloco_templates" as any)
        .delete()
        .eq("id", templateId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["bloco-templates", personalId],
      });
      toast.success("Template removido");
    },
    onError: (error: any) => {
      console.error("Erro ao deletar template:", error);
      toast.error("Erro ao remover template");
    },
  });

  const salvarBlocoComoTemplate = async (bloco: BlocoTreino, nomeTemplate?: string) => {
    return criarTemplateMutation.mutateAsync({
      nome: nomeTemplate || bloco.nome,
      tipo: bloco.tipo,
      posicao: bloco.posicao,
      duracao_estimada_minutos: bloco.duracao_estimada_minutos,
      descricao: bloco.descricao,
      config_cardio: bloco.config_cardio,
      config_alongamento: bloco.config_alongamento,
      config_aquecimento: bloco.config_aquecimento,
      config_outro: bloco.config_outro,
    });
  };

  return {
    templates,
    loading,
    error,
    criarTemplate: (input: CriarBlocoTemplateInput) =>
      criarTemplateMutation.mutateAsync(input),
    deletarTemplate: (templateId: string) =>
      deletarTemplateMutation.mutateAsync(templateId),
    salvarBlocoComoTemplate,
    isCriando: criarTemplateMutation.isPending,
    isDeletando: deletarTemplateMutation.isPending,
  };
}
