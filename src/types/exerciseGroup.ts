// src/types/exerciseGroup.ts

// Tipos para agrupamento de exercícios
export type TipoAgrupamento =
  | "normal"
  | "bi-set"
  | "tri-set"
  | "drop-set"
  | "superset"
  | "circuito";

export interface ExercicioAgrupado {
  id: string;
  nome: string;
  link_video?: string | null;
  series: number;
  repeticoes: string;
  descanso: number;
  carga?: string | null; // Peso RECOMENDADO pelo personal
  peso_executado?: string | null; // Peso que o aluno realmente executou
  observacoes?: string | null;
  concluido?: boolean;
  ordem: number;

  // Campos de agrupamento (opcionais / nullable)
  grupo_id?: string | null; // ID do grupo (NULL = exercício isolado)
  tipo_agrupamento?: TipoAgrupamento | null;
  ordem_no_grupo?: number | null; // Ordem dentro do grupo (1, 2, 3...)
  descanso_entre_grupos?: number | null; // descanso aplicado ao grupo (em segundos)
}

export interface GrupoExercicios {
  id: string;
  tipo: TipoAgrupamento;
  exercicios: ExercicioAgrupado[];
  descanso_entre_grupos?: number | null;
  observacoes?: string | null;
}

// Configurações de agrupamento
export interface TipoAgrupamentoConfig {
  readonly label: string;
  readonly descricao: string;
  readonly max_exercicios: number;
  readonly icon: string | React.ReactNode;
  readonly exemplo?: string; // opcional — nem todos os tipos possuem exemplo
}

export const TIPOS_AGRUPAMENTO: Record<TipoAgrupamento, TipoAgrupamentoConfig> =
  {
    normal: {
      label: "Normal",
      descricao: "Exercício isolado",
      max_exercicios: 1,
      icon: "1️⃣",
    },
    "bi-set": {
      label: "Bi-set",
      descricao: "2 exercícios alternados sem descanso",
      max_exercicios: 2,
      icon: "🔄",
      exemplo: "Supino + Rosca Bíceps",
    },
    "tri-set": {
      label: "Tri-set",
      descricao: "3 exercícios em sequência",
      max_exercicios: 3,
      icon: "🔀",
      exemplo: "Agachamento + Leg Press + Cadeira Extensora",
    },
    "drop-set": {
      label: "Drop-set",
      descricao: "Mesmo exercício com cargas decrescentes",
      max_exercicios: 1,
      icon: "📉",
      exemplo: "Rosca Direta: 20kg → 15kg → 10kg",
    },
    superset: {
      label: "Superset",
      descricao: "2 exercícios antagonistas",
      max_exercicios: 2,
      icon: "⚡",
      exemplo: "Bíceps + Tríceps",
    },
    circuito: {
      label: "Circuito",
      descricao: "4 ou mais exercícios em sequência contínua",
      max_exercicios: 10,
      icon: "🔁",
      exemplo: "Agachamento + Flexão + Abdominal + Burpee",
    },
  };
