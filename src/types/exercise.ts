export interface Exercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  equipamento?: string; // ← NOVO
  nivel_dificuldade?: string; // ← NOVO
  link_youtube?: string;
  descricao?: string;
  imagem_thumbnail?: string;
  created_by: string;
  is_global: boolean;
  created_at: string;
  updated_at?: string;
}

export type GrupoMuscular =
  | "peito"
  | "costas"
  | "pernas"
  | "ombros"
  | "biceps"
  | "triceps"
  | "abdomen"
  | "gluteos"
  | "cardio"
  | "outro";

export type Equipamento =
  | "barra"
  | "halteres"
  | "maquina"
  | "peso_corporal"
  | "elastico"
  | "kettlebell"
  | "cabo"
  | "outro";

export type NivelDificuldade = "iniciante" | "intermediario" | "avancado";

export const GRUPOS_MUSCULARES: GrupoMuscular[] = [
  "peito",
  "costas",
  "pernas",
  "ombros",
  "biceps",
  "triceps",
  "abdomen",
  "gluteos",
  "cardio",
  "outro",
];

export const EQUIPAMENTOS: Equipamento[] = [
  "barra",
  "halteres",
  "maquina",
  "peso_corporal",
  "elastico",
  "kettlebell",
  "cabo",
  "outro",
];

export const NIVEIS_DIFICULDADE: NivelDificuldade[] = [
  "iniciante",
  "intermediario",
  "avancado",
];
