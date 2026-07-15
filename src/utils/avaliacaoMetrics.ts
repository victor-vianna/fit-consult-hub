export type AssessmentRecord = Record<string, any>;

export const GENERAL_FIELDS = [
  { key: "peso", label: "Peso", unit: "kg" },
  { key: "altura", label: "Altura", unit: "m" },
  { key: "imc", label: "IMC", unit: "" },
  { key: "percentual_gordura", label: "% gordura", unit: "%" },
  { key: "massa_gorda", label: "Massa gorda", unit: "kg" },
  { key: "massa_magra", label: "Massa magra", unit: "kg" },
  { key: "massa_muscular", label: "Massa muscular", unit: "kg" },
  { key: "densidade_corporal", label: "Densidade", unit: "" },
] as const;

export const PERIMETRY_FIELDS = [
  { key: "pescoco", label: "Pescoco", unit: "cm" },
  { key: "ombro", label: "Ombro", unit: "cm" },
  { key: "torax", label: "Torax", unit: "cm" },
  { key: "cintura", label: "Cintura", unit: "cm" },
  { key: "abdomen", label: "Abdomen", unit: "cm" },
  { key: "quadril", label: "Quadril", unit: "cm" },
  { key: "braco_direito", label: "Braco direito", unit: "cm" },
  { key: "braco_esquerdo", label: "Braco esquerdo", unit: "cm" },
  { key: "antebraco_direito", label: "Antebraco direito", unit: "cm" },
  { key: "antebraco_esquerdo", label: "Antebraco esquerdo", unit: "cm" },
  { key: "coxa_direita", label: "Coxa direita", unit: "cm" },
  { key: "coxa_esquerda", label: "Coxa esquerda", unit: "cm" },
  { key: "panturrilha_direita", label: "Panturrilha direita", unit: "cm" },
  { key: "panturrilha_esquerda", label: "Panturrilha esquerda", unit: "cm" },
] as const;

export const SKINFOLD_FIELDS = [
  { key: "peitoral", label: "Peitoral", unit: "mm" },
  { key: "bicipital", label: "Bicipital", unit: "mm" },
  { key: "tricipital", label: "Tricipital", unit: "mm" },
  { key: "subescapular", label: "Subescapular", unit: "mm" },
  { key: "axilar_media", label: "Axilar media", unit: "mm" },
  { key: "suprailiaca", label: "Suprailiaca", unit: "mm" },
  { key: "abdominal", label: "Abdominal", unit: "mm" },
  { key: "femural", label: "Femural", unit: "mm" },
  { key: "panturrilha", label: "Panturrilha", unit: "mm" },
] as const;

export const FLEXIBILITY_FIELDS = [
  { key: "flexibilidade_sentar_alcancar", label: "Sentar e alcancar", unit: "cm" },
] as const;

export const CARDIO_FIELDS = [
  { key: "cardio_velocidade_kmh", label: "Velocidade media", unit: "km/h" },
  { key: "cardio_vo2_pico", label: "VO2 pico", unit: "ml/kg/min" },
  { key: "cardio_mssl_kmh", label: "MSSL", unit: "km/h" },
] as const;

export const EVOLUTION_METRICS = [
  ...GENERAL_FIELDS,
  ...PERIMETRY_FIELDS,
  ...SKINFOLD_FIELDS,
  ...FLEXIBILITY_FIELDS,
  ...CARDIO_FIELDS,
].map((metric, index) => ({
  ...metric,
  color: [
    "#38bdf8",
    "#22c55e",
    "#f59e0b",
    "#ef4444",
    "#a855f7",
    "#14b8a6",
    "#ec4899",
    "#84cc16",
  ][index % 8],
}));

export function toNumber(value: FormDataEntryValue | string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function round(value: number | null | undefined, decimals = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return Number(value.toFixed(decimals));
}

export function average(values: Array<number | null>) {
  const valid = values.filter((value): value is number => value !== null && Number.isFinite(value));
  if (valid.length === 0) return null;
  return round(valid.reduce((sum, value) => sum + value, 0) / valid.length, 1);
}

export function getSkinfoldAverage(record: AssessmentRecord, key: string) {
  const medias = record.dobras_medias || {};
  return typeof medias[key] === "number" ? medias[key] : null;
}

export function flattenAssessmentMetric(record: AssessmentRecord, key: string) {
  if (key in record && record[key] !== null && record[key] !== undefined) return record[key];
  const skinfold = getSkinfoldAverage(record, key);
  return skinfold;
}

export function calculateImc(peso: number | null, altura: number | null) {
  if (!peso || !altura) return null;
  return round(peso / (altura * altura), 2);
}

export function calculateBodyComposition(input: {
  peso: number | null;
  altura: number | null;
  idade: number | null;
  sexo: string | null;
  fase: string | null;
  dobrasMedias: Record<string, number>;
}) {
  const imc = calculateImc(input.peso, input.altura);
  const sum7 = [
    "peitoral",
    "axilar_media",
    "tricipital",
    "subescapular",
    "abdominal",
    "suprailiaca",
    "femural",
  ].reduce((sum, key) => sum + (input.dobrasMedias[key] || 0), 0);
  let densidade: number | null = null;
  let percentualGordura: number | null = null;

  const idade = input.idade;
  const sexo = (input.sexo || "").toLowerCase();
  const hasReferenceData = Boolean(idade && (sexo.startsWith("f") || sexo.startsWith("m")));

  if (sum7 > 0 && hasReferenceData && idade) {
    if (sexo.startsWith("f")) {
      densidade = 1.097 - 0.00046971 * sum7 + 0.00000056 * sum7 * sum7 - 0.00012828 * idade;
    } else {
      densidade = 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 * sum7 - 0.00028826 * idade;
    }
    percentualGordura = densidade > 0 ? round(495 / densidade - 450, 1) : null;
  } else if ((input.fase || "").toLowerCase() === "crianca" && imc && hasReferenceData && idade) {
    const sexFlag = sexo.startsWith("m") ? 1 : 0;
    percentualGordura = round(1.51 * imc - 0.7 * idade - 3.6 * sexFlag + 1.4, 1);
  }

  const massaGorda = input.peso && percentualGordura !== null ? round(input.peso * (percentualGordura / 100), 1) : null;
  const massaMagra = input.peso && massaGorda !== null ? round(input.peso - massaGorda, 1) : null;
  const massaMuscular = massaMagra !== null ? round(massaMagra * 0.55, 1) : null;
  const massaOssosOrgaos = massaMagra !== null && massaMuscular !== null ? round(massaMagra - massaMuscular, 1) : null;

  return {
    imc,
    percentual_gordura: percentualGordura,
    massa_gorda: massaGorda,
    massa_magra: massaMagra,
    massa_muscular: massaMuscular,
    massa_ossos_orgaos: massaOssosOrgaos,
    densidade_corporal: round(densidade, 4),
    distribuicao_gordura: calculateFatDistribution(input.dobrasMedias),
  };
}

export function calculateFatDistribution(dobrasMedias: Record<string, number>) {
  const superiores = ["peitoral", "bicipital", "tricipital"].reduce((sum, key) => sum + (dobrasMedias[key] || 0), 0);
  const inferiores = ["femural", "panturrilha"].reduce((sum, key) => sum + (dobrasMedias[key] || 0), 0);
  const tronco = ["subescapular", "axilar_media", "suprailiaca", "abdominal"].reduce((sum, key) => sum + (dobrasMedias[key] || 0), 0);
  const total = superiores + inferiores + tronco;

  if (total <= 0) return null;
  return {
    membros_superiores: round((superiores / total) * 100, 1),
    membros_inferiores: round((inferiores / total) * 100, 1),
    tronco: round((tronco / total) * 100, 1),
  };
}

export function calculateAssessmentPending(data: AssessmentRecord) {
  const missing: string[] = [];
  if (!data.peso || !data.altura) missing.push("dados gerais");
  if (PERIMETRY_FIELDS.every(({ key }) => data[key] === null || data[key] === undefined)) missing.push("perimetria");
  if (!data.dobras_medias || Object.keys(data.dobras_medias).length === 0) missing.push("dobras cutaneas");
  return missing;
}

export function calculateCardio(input: { distanciaM: number | null; tempoSegundos: number | null }) {
  if (!input.distanciaM || !input.tempoSegundos) {
    return {
      cardio_velocidade_kmh: null,
      cardio_vo2_pico: null,
      cardio_mssl_m_min: null,
      cardio_mssl_kmh: null,
    };
  }
  const tempoMin = input.tempoSegundos / 60;
  const velocidadeMMin = input.distanciaM / tempoMin;
  const velocidadeKmh = velocidadeMMin / 16.7;
  const msslMMin = velocidadeMMin * 0.7507 + 21.575;
  const msslKmh = msslMMin / 16.7;
  const vo2Pico = 0.177 * velocidadeMMin + 8.101;

  return {
    cardio_velocidade_kmh: round(velocidadeKmh, 2),
    cardio_vo2_pico: round(vo2Pico, 1),
    cardio_mssl_m_min: round(msslMMin, 1),
    cardio_mssl_kmh: round(msslKmh, 2),
  };
}

export function formatMetricValue(value: any, unit = "") {
  if (value === null || value === undefined || value === "") return "-";
  const numeric = typeof value === "number" ? value : Number(value);
  const formatted = Number.isFinite(numeric) ? String(round(numeric, unit === "" ? 2 : 1)) : String(value);
  return `${formatted}${unit ? ` ${unit}` : ""}`;
}

export type ClassificationTone = "success" | "info" | "warning" | "danger" | "muted";

export interface MetricClassification {
  label: string;
  tone: ClassificationTone;
  detail?: string;
}

export interface BodyFatRange {
  label: string;
  min: number;
  max: number;
  tone: ClassificationTone;
}

const BODY_FAT_RANGES = {
  masculino: [
    {
      minAge: 18,
      maxAge: 29,
      ranges: [
        { label: "Muito magro", min: 0, max: 7, tone: "warning" },
        { label: "Excelente", min: 7, max: 11, tone: "success" },
        { label: "Bom", min: 11, max: 14, tone: "success" },
        { label: "Razoavel", min: 14, max: 18, tone: "info" },
        { label: "Ruim", min: 18, max: 23, tone: "warning" },
        { label: "Muito ruim", min: 23, max: 35, tone: "danger" },
      ],
    },
    {
      minAge: 30,
      maxAge: 39,
      ranges: [
        { label: "Muito magro", min: 0, max: 10, tone: "warning" },
        { label: "Excelente", min: 10, max: 14, tone: "success" },
        { label: "Bom", min: 14, max: 17, tone: "success" },
        { label: "Razoavel", min: 17, max: 21, tone: "info" },
        { label: "Ruim", min: 21, max: 25, tone: "warning" },
        { label: "Muito ruim", min: 25, max: 37, tone: "danger" },
      ],
    },
    {
      minAge: 40,
      maxAge: 49,
      ranges: [
        { label: "Muito magro", min: 0, max: 12, tone: "warning" },
        { label: "Excelente", min: 12, max: 16, tone: "success" },
        { label: "Bom", min: 16, max: 20, tone: "success" },
        { label: "Razoavel", min: 20, max: 23, tone: "info" },
        { label: "Ruim", min: 23, max: 27, tone: "warning" },
        { label: "Muito ruim", min: 27, max: 39, tone: "danger" },
      ],
    },
    {
      minAge: 50,
      maxAge: 120,
      ranges: [
        { label: "Muito magro", min: 0, max: 14, tone: "warning" },
        { label: "Excelente", min: 14, max: 18, tone: "success" },
        { label: "Bom", min: 18, max: 21, tone: "success" },
        { label: "Razoavel", min: 21, max: 25, tone: "info" },
        { label: "Ruim", min: 25, max: 29, tone: "warning" },
        { label: "Muito ruim", min: 29, max: 42, tone: "danger" },
      ],
    },
  ],
  feminino: [
    {
      minAge: 18,
      maxAge: 29,
      ranges: [
        { label: "Muito magro", min: 0, max: 14, tone: "warning" },
        { label: "Excelente", min: 14, max: 17, tone: "success" },
        { label: "Bom", min: 17, max: 21, tone: "success" },
        { label: "Razoavel", min: 21, max: 24, tone: "info" },
        { label: "Ruim", min: 24, max: 29, tone: "warning" },
        { label: "Muito ruim", min: 29, max: 43, tone: "danger" },
      ],
    },
    {
      minAge: 30,
      maxAge: 39,
      ranges: [
        { label: "Muito magro", min: 0, max: 15, tone: "warning" },
        { label: "Excelente", min: 15, max: 18, tone: "success" },
        { label: "Bom", min: 18, max: 22, tone: "success" },
        { label: "Razoavel", min: 22, max: 25, tone: "info" },
        { label: "Ruim", min: 25, max: 30, tone: "warning" },
        { label: "Muito ruim", min: 30, max: 45, tone: "danger" },
      ],
    },
    {
      minAge: 40,
      maxAge: 49,
      ranges: [
        { label: "Muito magro", min: 0, max: 16, tone: "warning" },
        { label: "Excelente", min: 16, max: 20, tone: "success" },
        { label: "Bom", min: 20, max: 23, tone: "success" },
        { label: "Razoavel", min: 23, max: 27, tone: "info" },
        { label: "Ruim", min: 27, max: 32, tone: "warning" },
        { label: "Muito ruim", min: 32, max: 47, tone: "danger" },
      ],
    },
    {
      minAge: 50,
      maxAge: 120,
      ranges: [
        { label: "Muito magro", min: 0, max: 17, tone: "warning" },
        { label: "Excelente", min: 17, max: 21, tone: "success" },
        { label: "Bom", min: 21, max: 25, tone: "success" },
        { label: "Razoavel", min: 25, max: 29, tone: "info" },
        { label: "Ruim", min: 29, max: 34, tone: "warning" },
        { label: "Muito ruim", min: 34, max: 50, tone: "danger" },
      ],
    },
  ],
} satisfies Record<string, Array<{ minAge: number; maxAge: number; ranges: BodyFatRange[] }>>;

export function normalizeAssessmentSex(sexo?: string | null) {
  const normalized = (sexo || "").toLowerCase();
  if (normalized.startsWith("f")) return "feminino";
  if (normalized.startsWith("m")) return "masculino";
  return null;
}

export function getBodyFatRanges(idade?: number | null, sexo?: string | null) {
  const normalizedSex = normalizeAssessmentSex(sexo);
  if (!idade || !normalizedSex) return null;
  return BODY_FAT_RANGES[normalizedSex].find(
    (item) => idade >= item.minAge && idade <= item.maxAge
  )?.ranges ?? null;
}

export function classifyBodyFat(value?: number | null, idade?: number | null, sexo?: string | null): MetricClassification {
  if (value === null || value === undefined) return { label: "Sem dado", tone: "muted" };
  const ranges = getBodyFatRanges(idade, sexo);
  if (!ranges) return { label: "Sem referencia", tone: "muted", detail: "Informe idade e sexo." };
  const matched = ranges.find((range) => value >= range.min && value < range.max) ?? ranges[ranges.length - 1];
  return { label: matched.label, tone: matched.tone };
}

export function classifyBmi(value?: number | null): MetricClassification {
  if (value === null || value === undefined) return { label: "Sem dado", tone: "muted" };
  if (value < 18.5) return { label: "Baixo peso", tone: "warning" };
  if (value < 25) return { label: "Normal", tone: "success" };
  if (value < 30) return { label: "Sobrepeso", tone: "warning" };
  return { label: "Risco alto", tone: "danger" };
}

export function classifyAbdominalCircumference(
  value?: number | null,
  sexo?: string | null
): MetricClassification {
  if (value === null || value === undefined) return { label: "Sem dado", tone: "muted" };
  const normalizedSex = normalizeAssessmentSex(sexo);
  if (!normalizedSex) return { label: "Sem referencia", tone: "muted", detail: "Informe sexo." };
  const increased = normalizedSex === "feminino" ? 80 : 94;
  const high = normalizedSex === "feminino" ? 88 : 102;
  if (value >= high) return { label: "Risco alto", tone: "danger" };
  if (value >= increased) return { label: "Atenção", tone: "warning" };
  return { label: "Normal", tone: "success" };
}

export function classifyLeanFatBalance(
  massaMagra?: number | null,
  massaGorda?: number | null,
  peso?: number | null,
  idade?: number | null,
  sexo?: string | null
): MetricClassification {
  if (!massaMagra || !massaGorda || !peso) return { label: "Sem dado", tone: "muted" };
  const bodyFatPercent = (massaGorda / peso) * 100;
  const bodyFat = classifyBodyFat(bodyFatPercent, idade, sexo);
  if (bodyFat.tone === "danger") return { label: "Desequilibrado", tone: "danger" };
  if (bodyFat.tone === "warning") return { label: "Atenção", tone: "warning" };
  if (bodyFat.tone === "muted") return { label: "Sem referencia", tone: "muted" };
  return { label: "Saudável", tone: "success" };
}
