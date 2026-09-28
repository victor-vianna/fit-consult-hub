const ALWAYS_ALLOWED_ALUNO_SECTIONS = [
  "inicio",
  "treinos",
  "chat",
  "dados",
  "plano",
] as const;

export function getAllowedAlunoSections(
  cardsVisiveis: readonly string[]
): string[] {
  return Array.from(
    new Set([...ALWAYS_ALLOWED_ALUNO_SECTIONS, ...cardsVisiveis])
  );
}

export function resolveInitialAlunoSection({
  urlSection,
  storedSection,
  allowedSections,
}: {
  urlSection: string | null;
  storedSection: string | null;
  allowedSections: readonly string[];
}): string {
  if (urlSection && allowedSections.includes(urlSection)) return urlSection;
  if (storedSection && allowedSections.includes(storedSection)) {
    return storedSection;
  }

  return "inicio";
}
