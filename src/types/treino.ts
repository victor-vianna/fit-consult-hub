// src/types/treino.ts

export interface Exercicio {
  id: string;
  treino_semanal_id: string | null;
  nome: string;
  link_video: string | null;
  ordem: number;
  ordem_no_grupo: number | null;
  series: number | null;
  repeticoes: string | null;
  descanso: number | null;
  descanso_entre_grupos: number | null;
  carga: string | null; // Peso RECOMENDADO pelo personal
  peso_executado: string | null; // Peso que o aluno realmente executou
  observacoes: string | null;
  concluido: boolean;
  grupo_id: string | null;
  tipo_agrupamento: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

export interface TreinoDia {
  dia: number;
  treinoId: string | null;
  exercicios: Exercicio[];
  grupos?: any[];
  blocos?: any[];
  descricao: string | null;
  concluido: boolean;
  // Novos campos para múltiplos treinos por dia
  nome_treino?: string;
  ordem_no_dia?: number;
}

// Interface para agrupar múltiplos treinos do mesmo dia
export interface TreinosDoDia {
  dia: number;
  treinos: TreinoDia[];
}
