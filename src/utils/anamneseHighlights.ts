export type AnamneseHighlightField = {
  key: string;
  label: string;
  section: "Objetivo" | "Saude" | "Rotina" | "Treino";
  important?: boolean;
};

export const ANAMNESE_HIGHLIGHT_FIELDS: AnamneseHighlightField[] = [
  { key: "objetivos", label: "Objetivos do aluno", section: "Objetivo", important: true },
  { key: "dores_lesoes", label: "Dores ou lesoes", section: "Saude", important: true },
  { key: "restricao_medica", label: "Restricao medica", section: "Saude", important: true },
  { key: "cirurgias", label: "Cirurgias", section: "Saude", important: true },
  { key: "medicamentos", label: "Medicamentos em uso", section: "Saude", important: true },
  { key: "problema_coracao", label: "Problema cardiaco", section: "Saude", important: true },
  { key: "problema_respiratorio", label: "Problema respiratorio", section: "Saude", important: true },
  { key: "pressao_arterial", label: "Pressao arterial", section: "Saude", important: true },
  { key: "diabetes", label: "Diabetes", section: "Saude", important: true },
  { key: "alergia", label: "Alergias", section: "Saude" },
  { key: "rotina", label: "Rotina diaria", section: "Rotina", important: true },
  { key: "horas_sono", label: "Horas de sono", section: "Rotina" },
  { key: "qualidade_sono", label: "Qualidade do sono", section: "Rotina" },
  { key: "rotina_alimentar", label: "Rotina alimentar", section: "Rotina" },
  { key: "exercicio_atual", label: "Exercicio atual", section: "Treino", important: true },
  { key: "compromisso_treinos", label: "Compromisso semanal", section: "Treino", important: true },
  { key: "tempo_disponivel", label: "Tempo disponivel", section: "Treino", important: true },
  { key: "local_treino", label: "Local de treino", section: "Treino", important: true },
  { key: "materiais_disponiveis", label: "Materiais disponiveis", section: "Treino", important: true },
  { key: "preferencia_exercicio", label: "Preferencia de exercicios", section: "Treino" },
  { key: "exercicios_gosta", label: "Exercicios que gosta", section: "Treino" },
  { key: "exercicios_odeia", label: "Exercicios que evita", section: "Treino", important: true },
  { key: "observacoes_extras", label: "Observacoes extras", section: "Treino", important: true },
];

export function formatAnamneseValue(value: unknown) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value === "boolean") return value ? "Sim" : "Nao";
  if (typeof value === "number") return String(value);
  return String(value).trim();
}

export function getFilledAnamneseFields(anamnese: Record<string, unknown> | null | undefined) {
  if (!anamnese) return [];

  return ANAMNESE_HIGHLIGHT_FIELDS.map((field) => ({
    ...field,
    value: formatAnamneseValue(anamnese[field.key]),
  })).filter((field) => field.value.length > 0);
}
