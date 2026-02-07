// Types para sistema de blocos de treino

export type TipoBloco =
  | "alongamento"
  | "mobilidade"
  | "cardio"
  | "aquecimento"
  | "principal"
  | "finalização"
  | "outro";

export type PosicaoBloco = "inicio" | "meio" | "fim";

// Tipos específicos de cardio
export type TipoCardio =
  | "esteira"
  | "bike"
  | "remo"
  | "airbike"
  | "eliptico"
  | "escada"
  | "pular-corda"
  | "corrida-livre"
  | "outro";

export type ModalidadeCardio = "continuo" | "hiit" | "intervalado";

export type UnidadeIntensidade =
  | "rpm"
  | "bpm"
  | "velocidade"
  | "watts"
  | "percentual";

// Configurações específicas para cardio
export interface ConfigCardio {
  tipo: TipoCardio;
  modalidade: ModalidadeCardio;
  duracao_minutos: number;
  intensidade?: {
    valor: number;
    unidade: UnidadeIntensidade;
  };
  // Para HIIT
  trabalho_segundos?: number;
  descanso_segundos?: number;
  rounds?: number;
  // Outras métricas
  velocidade_kmh?: number;
  inclinacao_percentual?: number;
  resistencia?: number;
  batimentos_alvo?: {
    minimo: number;
    maximo: number;
  };
}

// Configurações para alongamento/mobilidade
export interface ConfigAlongamento {
  grupos_musculares: string[];
  duracao_minutos: number;
  tipo: "estatico" | "dinamico" | "misto";
  observacoes?: string;
}

// Configurações para aquecimento
export interface ConfigAquecimento {
  duracao_minutos: number;
  tipo: "geral" | "especifico";
  atividades: string[];
  observacoes?: string;
}

// Bloco genérico
export interface BlocoTreino {
  id: string;
  treino_semanal_id: string; // ✅ adicione este campo
  tipo: TipoBloco;
  posicao: "inicio" | "meio" | "fim";
  ordem: number;
  nome: string;
  descricao?: string;
  duracao_estimada_minutos?: number;
  obrigatorio?: boolean;
  config_cardio?: ConfigCardio;
  config_alongamento?: ConfigAlongamento;
  config_aquecimento?: ConfigAquecimento;
  config_outro?: any;
  concluido?: boolean;
  concluido_em?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

// Templates prontos
export interface TemplateBloco {
  id: string;
  nome: string;
  descricao: string;
  tipo: TipoBloco;
  config: Partial<BlocoTreino>;
  popular: boolean;
  categoria: string;
}

const normalizeTemplateKey = (s: string) =>
  (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Fallback para manter as especificações completas de blocos ao importar/aplicar modelos.
 * Se um bloco vier do banco sem configs (ex: config_cardio null), tentamos hidratar
 * usando os templates pré-definidos (TEMPLATES_BLOCOS) pelo nome.
 */
export function hidratarBlocoComTemplate(bloco: BlocoTreino): BlocoTreino {
  // Só aplicar fallback quando realmente estiver faltando alguma config
  const precisaCardio = bloco.tipo === "cardio" && !bloco.config_cardio;
  const precisaAlong =
    (bloco.tipo === "alongamento" || bloco.tipo === "mobilidade") &&
    !bloco.config_alongamento;
  const precisaAquec = bloco.tipo === "aquecimento" && !bloco.config_aquecimento;

  if (!precisaCardio && !precisaAlong && !precisaAquec) return bloco;

  const key = normalizeTemplateKey(bloco.nome);
  if (!key) return bloco;

  const template = TEMPLATES_BLOCOS.find((t) => {
    const tk = normalizeTemplateKey(t.config?.nome || t.nome);
    return tk === key && t.tipo === bloco.tipo;
  });

  if (!template) return bloco;

  return {
    ...template.config,
    ...bloco,
    // mantém descrição do bloco se já existir; senão usa a do template
    descricao: bloco.descricao ?? template.descricao,
    // garante que não sobrescrevemos configs reais
    config_cardio: bloco.config_cardio ?? (template.config as any).config_cardio,
    config_alongamento:
      bloco.config_alongamento ?? (template.config as any).config_alongamento,
    config_aquecimento:
      bloco.config_aquecimento ?? (template.config as any).config_aquecimento,
    config_outro: bloco.config_outro ?? (template.config as any).config_outro,
  };
}


// Configurações de cada tipo de bloco
export const TIPOS_BLOCO = {
  alongamento: {
    label: "Alongamento",
    icon: "🧘",
    cor: "purple",
    descricao: "Alongamentos estáticos ou dinâmicos",
    campos: ["grupos_musculares", "duracao", "tipo"],
  },
  mobilidade: {
    label: "Mobilidade",
    icon: "🤸",
    cor: "blue",
    descricao: "Exercícios de mobilidade articular",
    campos: ["grupos_musculares", "duracao"],
  },
  cardio: {
    label: "Cardio",
    icon: "🏃",
    cor: "red",
    descricao: "Exercícios cardiovasculares",
    campos: [
      "tipo_cardio",
      "modalidade",
      "duracao",
      "intensidade",
      "batimentos",
    ],
  },
  aquecimento: {
    label: "Aquecimento",
    icon: "🔥",
    cor: "orange",
    descricao: "Preparação para o treino principal",
    campos: ["duracao", "tipo", "atividades"],
  },
  principal: {
    label: "Treino Principal",
    icon: "💪",
    cor: "green",
    descricao: "Exercícios de musculação",
    campos: [],
  },
  finalização: {
    label: "Finalização",
    icon: "✨",
    cor: "teal",
    descricao: "Relaxamento e volta à calma",
    campos: ["duracao", "atividades"],
  },
  outro: {
    label: "Outro",
    icon: "📋",
    cor: "gray",
    descricao: "Bloco personalizado",
    campos: ["nome", "descricao"],
  },
} as const;

// Templates pré-definidos
export const TEMPLATES_BLOCOS: TemplateBloco[] = [
  // === CARDIO ===
  {
    id: "hiit-bike-10x30",
    nome: "HIIT Bike 10x30",
    descricao: "10 rounds de 30s forte + 30s leve",
    tipo: "cardio",
    categoria: "HIIT",
    popular: true,
    config: {
      tipo: "cardio",
      nome: "HIIT Bike 10x30",
      duracao_estimada_minutos: 10,
      config_cardio: {
        tipo: "bike",
        modalidade: "hiit",
        duracao_minutos: 10,
        trabalho_segundos: 30,
        descanso_segundos: 30,
        rounds: 10,
        intensidade: { valor: 90, unidade: "percentual" },
      },
    },
  },
  {
    id: "esteira-continuo-20min",
    nome: "Esteira 20min Contínuo",
    descricao: "Corrida moderada contínua",
    tipo: "cardio",
    categoria: "Contínuo",
    popular: true,
    config: {
      tipo: "cardio",
      nome: "Esteira 20min",
      duracao_estimada_minutos: 20,
      config_cardio: {
        tipo: "esteira",
        modalidade: "continuo",
        duracao_minutos: 20,
        velocidade_kmh: 10,
        inclinacao_percentual: 2,
        batimentos_alvo: { minimo: 130, maximo: 150 },
      },
    },
  },
  {
    id: "remo-intervalado",
    nome: "Remo Intervalado 15min",
    descricao: "5 rounds de 2min + 1min descanso",
    tipo: "cardio",
    categoria: "Intervalado",
    popular: false,
    config: {
      tipo: "cardio",
      nome: "Remo Intervalado",
      duracao_estimada_minutos: 15,
      config_cardio: {
        tipo: "remo",
        modalidade: "intervalado",
        duracao_minutos: 15,
        trabalho_segundos: 120,
        descanso_segundos: 60,
        rounds: 5,
      },
    },
  },
  {
    id: "airbike-brutal",
    nome: "Airbike Death Sprint",
    descricao: "20s all-out + 40s recuperação (8 rounds)",
    tipo: "cardio",
    categoria: "HIIT",
    popular: true,
    config: {
      tipo: "cardio",
      nome: "Airbike Death Sprint",
      duracao_estimada_minutos: 8,
      config_cardio: {
        tipo: "airbike",
        modalidade: "hiit",
        duracao_minutos: 8,
        trabalho_segundos: 20,
        descanso_segundos: 40,
        rounds: 8,
        intensidade: { valor: 95, unidade: "percentual" },
      },
    },
  },

  // === ALONGAMENTO ===
  {
    id: "alongamento-inferior",
    nome: "Alongamento Membros Inferiores",
    descricao: "Foco em pernas e quadril",
    tipo: "alongamento",
    categoria: "Geral",
    popular: true,
    config: {
      tipo: "alongamento",
      nome: "Alongamento Inferior",
      duracao_estimada_minutos: 8,
      config_alongamento: {
        grupos_musculares: [
          "Quadríceps",
          "Isquiotibiais",
          "Glúteos",
          "Panturrilha",
        ],
        duracao_minutos: 8,
        tipo: "estatico",
      },
    },
  },
  {
    id: "alongamento-superior",
    nome: "Alongamento Membros Superiores",
    descricao: "Foco em ombros, peito e costas",
    tipo: "alongamento",
    categoria: "Geral",
    popular: true,
    config: {
      tipo: "alongamento",
      nome: "Alongamento Superior",
      duracao_estimada_minutos: 6,
      config_alongamento: {
        grupos_musculares: ["Ombros", "Peitorais", "Dorsais", "Tríceps"],
        duracao_minutos: 6,
        tipo: "estatico",
      },
    },
  },
  {
    id: "alongamento-completo",
    nome: "Alongamento Completo",
    descricao: "Corpo inteiro - 15min",
    tipo: "alongamento",
    categoria: "Geral",
    popular: false,
    config: {
      tipo: "alongamento",
      nome: "Alongamento Completo",
      duracao_estimada_minutos: 15,
      config_alongamento: {
        grupos_musculares: [
          "Todos os grupos",
          "Corpo inteiro",
          "Flexibilidade geral",
        ],
        duracao_minutos: 15,
        tipo: "misto",
      },
    },
  },

  // === MOBILIDADE ===
  {
    id: "mobilidade-quadril",
    nome: "Mobilidade de Quadril",
    descricao: "90/90, cossack squat, hip circles",
    tipo: "mobilidade",
    categoria: "Inferior",
    popular: true,
    config: {
      tipo: "mobilidade",
      nome: "Mobilidade de Quadril",
      duracao_estimada_minutos: 10,
      config_alongamento: {
        grupos_musculares: ["Quadril", "Adutores", "Glúteos"],
        duracao_minutos: 10,
        tipo: "dinamico",
        observacoes:
          "90/90, cossack squat, hip circles, world's greatest stretch",
      },
    },
  },
  {
    id: "mobilidade-ombro",
    nome: "Mobilidade de Ombro",
    descricao: "Band pull-aparts, wall slides, círculos",
    tipo: "mobilidade",
    categoria: "Superior",
    popular: true,
    config: {
      tipo: "mobilidade",
      nome: "Mobilidade de Ombro",
      duracao_estimada_minutos: 8,
      config_alongamento: {
        grupos_musculares: ["Ombros", "Escapular", "Torácica"],
        duracao_minutos: 8,
        tipo: "dinamico",
        observacoes: "Band pull-aparts, wall slides, shoulder circles",
      },
    },
  },
  {
    id: "mobilidade-geral",
    nome: "Mobilidade Geral (Pre-Treino)",
    descricao: "Preparação articular completa",
    tipo: "mobilidade",
    categoria: "Geral",
    popular: true,
    config: {
      tipo: "mobilidade",
      nome: "Mobilidade Geral",
      duracao_estimada_minutos: 12,
      config_alongamento: {
        grupos_musculares: [
          "Tornozelo",
          "Quadril",
          "Coluna",
          "Ombros",
          "Punhos",
        ],
        duracao_minutos: 12,
        tipo: "dinamico",
      },
    },
  },

  // === AQUECIMENTO ===
  {
    id: "aquecimento-rapido",
    nome: "Aquecimento Rápido 5min",
    descricao: "Bike leve + movimentos dinâmicos",
    tipo: "aquecimento",
    categoria: "Rápido",
    popular: true,
    config: {
      tipo: "aquecimento",
      nome: "Aquecimento Rápido",
      duracao_estimada_minutos: 5,
      config_aquecimento: {
        duracao_minutos: 5,
        tipo: "geral",
        atividades: ["Bike leve 3min", "Jumping jacks", "Arm circles"],
      },
    },
  },
  {
    id: "aquecimento-completo",
    nome: "Aquecimento Completo 10min",
    descricao: "Cardio + mobilidade + ativação",
    tipo: "aquecimento",
    categoria: "Completo",
    popular: true,
    config: {
      tipo: "aquecimento",
      nome: "Aquecimento Completo",
      duracao_estimada_minutos: 10,
      config_aquecimento: {
        duracao_minutos: 10,
        tipo: "geral",
        atividades: [
          "Esteira 5min",
          "Mobilidade dinâmica",
          "Ativação glúteo",
          "Core prep",
        ],
      },
    },
  },

  // === FINALIZAÇÃO ===
  {
    id: "volta-calma",
    nome: "Volta à Calma",
    descricao: "Redução gradual da FC",
    tipo: "finalização",
    categoria: "Recuperação",
    popular: true,
    config: {
      tipo: "finalização",
      nome: "Volta à Calma",
      duracao_estimada_minutos: 5,
      descricao: "Caminhada leve + respiração diafragmática",
    },
  },
];

// Helper para obter cor do tipo
export const getCorTipoBloco = (tipo: TipoBloco): string => {
  const cores: Record<TipoBloco, string> = {
    alongamento: "purple",
    mobilidade: "blue",
    cardio: "red",
    aquecimento: "orange",
    principal: "green",
    finalização: "teal",
    outro: "gray",
  };
  return cores[tipo];
};

// Helper para formatar duração
export const formatarDuracao = (minutos: number): string => {
  if (minutos < 1) {
    return `${Math.round(minutos * 60)}s`;
  }
  if (minutos >= 60) {
    const horas = Math.floor(minutos / 60);
    const mins = minutos % 60;
    return mins > 0 ? `${horas}h${mins}min` : `${horas}h`;
  }
  return `${minutos}min`;
};

// Helper para formatar intensidade cardio
export const formatarIntensidadeCardio = (
  config: ConfigCardio | undefined
): string => {
  if (!config) return "";

  if (config.modalidade === "hiit" || config.modalidade === "intervalado") {
    return `${config.trabalho_segundos}s ON / ${config.descanso_segundos}s OFF × ${config.rounds}`;
  }

  if (config.intensidade) {
    const { valor, unidade } = config.intensidade;
    const unidades: Record<UnidadeIntensidade, string> = {
      rpm: "RPM",
      bpm: "BPM",
      velocidade: "km/h",
      watts: "W",
      percentual: "%",
    };
    return `${valor}${unidades[unidade]}`;
  }

  if (config.batimentos_alvo) {
    return `${config.batimentos_alvo.minimo}-${config.batimentos_alvo.maximo} BPM`;
  }

  return "Moderado";
};
