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
  descanso_entre_grupos: number | null; // <- adicionado
  carga: string | null; // frontend trabalha com número; mapeie do DB no hook
  observacoes: string | null;
  concluido: boolean;
  grupo_id: string | null;
  tipo_agrupamento: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null; // <- adicionado
}

export interface TreinoDia {
  dia: number;
  treinoId: string | null;
  exercicios: Exercicio[];
  grupos?: any[]; // substitua `any` por um tipo mais preciso quando disponível
  descricao: string | null;
  concluido: boolean;
}
