import { supabase } from "@/integrations/supabase/client";

type CopyModeloParams = {
  sourceModeloId: string;
  personalId: string;
  pastaId?: string | null;
  isGlobal?: boolean;
  minPlanLevel?: number;
  sourceModeloIdForAudit?: string | null;
};

export async function copyModeloTreino({
  sourceModeloId,
  personalId,
  pastaId = null,
  isGlobal = false,
  minPlanLevel = 1,
  sourceModeloIdForAudit = null,
}: CopyModeloParams) {
  const { data: modelo, error: modeloError } = await (supabase as any)
    .from("treino_modelos")
    .select("*")
    .eq("id", sourceModeloId)
    .single();

  if (modeloError) throw modeloError;

  const [{ data: exercicios, error: exerciciosError }, { data: blocos, error: blocosError }] =
    await Promise.all([
      (supabase as any)
        .from("treino_modelo_exercicios")
        .select("*")
        .eq("modelo_id", sourceModeloId)
        .order("ordem"),
      (supabase as any)
        .from("treino_modelo_blocos")
        .select("*")
        .eq("modelo_id", sourceModeloId)
        .order("ordem"),
    ]);

  if (exerciciosError) throw exerciciosError;
  if (blocosError) throw blocosError;

  const { data: novoModelo, error: novoModeloError } = await (supabase as any)
    .from("treino_modelos")
    .insert({
      personal_id: personalId,
      nome: modelo.nome,
      descricao: modelo.descricao,
      categoria: modelo.categoria,
      duracao_total_minutos: modelo.duracao_total_minutos,
      pasta_id: pastaId,
      is_global: isGlobal,
      min_plan_level: minPlanLevel,
      source_modelo_id: sourceModeloIdForAudit,
    })
    .select()
    .single();

  if (novoModeloError) throw novoModeloError;

  if ((exercicios || []).length > 0) {
    const payload = (exercicios || []).map((ex: any) => ({
      modelo_id: novoModelo.id,
      nome: ex.nome,
      link_video: ex.link_video,
      links_demonstracao: ex.links_demonstracao,
      series: ex.series,
      repeticoes: ex.repeticoes,
      descanso: ex.descanso,
      carga: ex.carga,
      observacoes: ex.observacoes,
      ordem: ex.ordem,
      grupo_id: ex.grupo_id,
      tipo_agrupamento: ex.tipo_agrupamento,
      ordem_no_grupo: ex.ordem_no_grupo,
      descanso_entre_grupos: ex.descanso_entre_grupos,
      exercicio_id: ex.exercicio_id,
    }));

    const { error } = await (supabase as any)
      .from("treino_modelo_exercicios")
      .insert(payload);

    if (error) throw error;
  }

  if ((blocos || []).length > 0) {
    const payload = (blocos || []).map((bloco: any) => ({
      modelo_id: novoModelo.id,
      tipo: bloco.tipo,
      nome: bloco.nome,
      duracao_estimada_minutos: bloco.duracao_estimada_minutos,
      observacoes: bloco.observacoes,
      descricao: bloco.descricao,
      config_cardio: bloco.config_cardio,
      config_alongamento: bloco.config_alongamento,
      config_aquecimento: bloco.config_aquecimento,
      config_outro: bloco.config_outro,
      intensidade: bloco.intensidade,
      posicao: bloco.posicao,
      ordem: bloco.ordem,
    }));

    const { error } = await (supabase as any)
      .from("treino_modelo_blocos")
      .insert(payload);

    if (error) throw error;
  }

  return novoModelo;
}
