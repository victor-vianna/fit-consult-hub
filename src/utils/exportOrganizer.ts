// Helper to organize blocks and exercises in a professional order for export
// Order: Mobilidade/Aquecimento → HIIT → Força (exercises) → Alongamentos → Outros

export interface OrganizedSection {
  label: string;
  type: "blocos" | "exercicios";
  items: any[];
}

const BLOCK_ORDER: Record<string, number> = {
  aquecimento: 1,
  mobilidade: 1,
  hiit: 2,
  cardio: 3,
  alongamento: 5,
  outro: 4,
};

function getBlockOrder(tipo: string): number {
  const t = (tipo || "").toLowerCase();
  for (const key of Object.keys(BLOCK_ORDER)) {
    if (t.includes(key)) return BLOCK_ORDER[key];
  }
  return 4;
}

const SECTION_LABELS: Record<number, string> = {
  1: "Mobilidade / Aquecimento",
  2: "HIIT",
  3: "Cardio",
  4: "Complementar",
  5: "Alongamento",
};

/**
 * Organizes blocks and exercises into ordered sections for professional export.
 * Returns sections in the order: Mobilidade → HIIT → Cardio → Força → Alongamento
 */
export function organizeForExport(
  exerciciosIsolados: any[],
  grupos: any[],
  blocos: any[]
): OrganizedSection[] {
  const sections: OrganizedSection[] = [];

  // Group blocks by category
  const blocosGrouped = new Map<number, any[]>();
  for (const bloco of blocos) {
    const order = getBlockOrder(bloco.tipo || "");
    if (!blocosGrouped.has(order)) blocosGrouped.set(order, []);
    blocosGrouped.get(order)!.push(bloco);
  }

  // Blocks before exercises (order 1-3)
  for (const order of [1, 2, 3]) {
    const items = blocosGrouped.get(order);
    if (items && items.length > 0) {
      sections.push({
        label: SECTION_LABELS[order] || "Bloco",
        type: "blocos",
        items,
      });
    }
  }

  // Exercises (Força)
  const hasExercicios = exerciciosIsolados.length > 0 || grupos.length > 0;
  if (hasExercicios) {
    sections.push({
      label: "Força",
      type: "exercicios",
      items: [...exerciciosIsolados.sort((a, b) => a.ordem - b.ordem)],
    });
  }

  // "Outro" blocks (order 4)
  const outrosItems = blocosGrouped.get(4);
  if (outrosItems && outrosItems.length > 0) {
    sections.push({
      label: SECTION_LABELS[4],
      type: "blocos",
      items: outrosItems,
    });
  }

  // Alongamento blocks (order 5)
  const alongItems = blocosGrouped.get(5);
  if (alongItems && alongItems.length > 0) {
    sections.push({
      label: SECTION_LABELS[5],
      type: "blocos",
      items: alongItems,
    });
  }

  return sections;
}
