import { buildOrderedWorkoutItems } from "./workoutNormalization";

export type OrganizedExportItem =
  | { type: "exercise"; data: any }
  | { type: "group"; data: any }
  | { type: "block"; data: any };

export interface OrganizedSection {
  label: string;
  type: "sequencia";
  items: OrganizedExportItem[];
}

export function organizeForExport(
  exerciciosIsolados: any[],
  grupos: any[],
  blocos: any[]
): OrganizedSection[] {
  const items = buildOrderedWorkoutItems<any, any, any>(
    exerciciosIsolados,
    grupos,
    blocos
  ).map((item) => ({
    type: item.type,
    data: item.data,
  })) as OrganizedExportItem[];

  if (items.length === 0) return [];

  return [
    {
      label: "Sequencia do treino",
      type: "sequencia",
      items,
    },
  ];
}
