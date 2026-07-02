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
  const idade = input.idade || 30;
  const sexo = (input.sexo || "").toLowerCase();

  let densidade: number | null = null;
  let percentualGordura: number | null = null;

  if (sum7 > 0) {
    if (sexo.startsWith("f")) {
      densidade = 1.097 - 0.00046971 * sum7 + 0.00000056 * sum7 * sum7 - 0.00012828 * idade;
    } else {
      densidade = 1.112 - 0.00043499 * sum7 + 0.00000055 * sum7 * sum7 - 0.00028826 * idade;
    }
    percentualGordura = densidade > 0 ? round(495 / densidade - 450, 1) : null;
  } else if ((input.fase || "").toLowerCase() === "crianca" && imc) {
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
