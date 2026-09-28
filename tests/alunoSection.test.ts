import {
  getAllowedAlunoSections,
  resolveInitialAlunoSection,
} from "../src/utils/alunoSection.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

const DEFAULT_CARDS_VISIVEIS = [
  "treinos",
  "chat",
  "avaliacao",
  "historico",
  "materiais",
  "plano",
  "biblioteca",
] as const;

Deno.test("an allowed URL section wins over the stored section", () => {
  assertEquals(
    resolveInitialAlunoSection({
      urlSection: "treinos",
      storedSection: "chat",
      allowedSections: ["inicio", "treinos", "chat"],
    }),
    "treinos",
    "URL section precedence"
  );
});

Deno.test("an invalid URL section falls back to the stored section", () => {
  assertEquals(
    resolveInitialAlunoSection({
      urlSection: "oculta",
      storedSection: "chat",
      allowedSections: ["inicio", "chat"],
    }),
    "chat",
    "Stored section fallback"
  );
});

Deno.test("invalid URL and stored sections fall back to inicio", () => {
  assertEquals(
    resolveInitialAlunoSection({
      urlSection: "oculta",
      storedSection: "tambem-oculta",
      allowedSections: ["inicio", "chat"],
    }),
    "inicio",
    "Default section fallback"
  );
});

Deno.test("tab query parameter works as the URL section alias", () => {
  const params = new URLSearchParams("?tab=historico");
  const urlSection = params.get("section") || params.get("tab");

  assertEquals(
    resolveInitialAlunoSection({
      urlSection,
      storedSection: "chat",
      allowedSections: ["inicio", "historico", "chat"],
    }),
    "historico",
    "Tab alias"
  );
});

Deno.test("default visible cards preserve the current allowed sections", () => {
  assertEquals(
    getAllowedAlunoSections(DEFAULT_CARDS_VISIVEIS),
    [
      "inicio",
      "treinos",
      "chat",
      "dados",
      "plano",
      "avaliacao",
      "historico",
      "materiais",
      "biblioteca",
    ],
    "Allowed sections for default cards"
  );
});
