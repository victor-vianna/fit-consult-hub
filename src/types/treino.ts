export interface Exercicio {
  id: string;
  treino_semanal_id: string;
  nome: string;
  link_video?: string | null;
  ordem: number;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: number | null;
  observacoes?: string | null;
  concluido?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TreinoDia {
  dia: number;
  treinoId: string | null;
  exercicios: Exercicio[];
  descricao: string | null;
  concluido?: boolean;
}
