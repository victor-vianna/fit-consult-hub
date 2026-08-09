import type { Exercicio } from "@/types/treino";
import type { BlocoTreino } from "@/types/workoutBlocks";

export type ExerciseLike = Partial<Exercicio> & Record<string, any>;
export type BlockLike = Partial<BlocoTreino> & Record<string, any>;

export type ExerciseGroupLike<TExercise extends ExerciseLike = ExerciseLike> = {
  grupo_id?: string | null;
  tipo_agrupamento?: string | null;
  descanso_entre_grupos?: number | null;
  ordem?: number | null;
  exercicios?: TExercise[] | null;
  [key: string]: any;
};

export type OrderedWorkoutItem<
  TExercise extends ExerciseLike = ExerciseLike,
  TGroup extends ExerciseGroupLike<TExercise> = ExerciseGroupLike<TExercise>,
  TBlock extends BlockLike = BlockLike
> =
  | { type: "exercise"; ordem: number; data: TExercise }
  | { type: "group"; ordem: number; data: TGroup }
  | { type: "block"; ordem: number; data: TBlock };

const POSITION_ORDER: Record<string, number> = {
  inicio: 1,
  meio: 2,
  fim: 3,
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function normalizeNumber(value: unknown, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function stableSerialize(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableSerialize(item)).join(",")}]`;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${key}:${stableSerialize(record[key])}`)
      .join(",")}}`;
  }
  return String(value);
}

function mergeProgress<T extends Record<string, any>>(base: T, incoming: T): T {
  const baseSeries = normalizeNumber(base.series_concluidas, 0);
  const incomingSeries = normalizeNumber(incoming.series_concluidas, 0);

  return {
    ...base,
    concluido: Boolean(base.concluido) || Boolean(incoming.concluido),
    series_concluidas: Math.max(baseSeries, incomingSeries),
    concluido_em: base.concluido_em ?? incoming.concluido_em,
  };
}

function getExerciseSignature(
  exercicio: ExerciseLike,
  options: boolean | { ignoreGroupId?: boolean; ignoreOrder?: boolean } = false
) {
  const ignoreGroupId =
    typeof options === "boolean" ? options : Boolean(options.ignoreGroupId);
  const ignoreOrder =
    typeof options === "boolean" ? false : Boolean(options.ignoreOrder);

  return [
    normalizeText(exercicio.treino_semanal_id),
    normalizeText(exercicio.nome),
    ignoreOrder ? "" : normalizeNumber(exercicio.ordem, 0),
    ignoreOrder ? "" : normalizeNumber(exercicio.ordem_no_grupo, 0),
    normalizeNumber(exercicio.series, 0),
    normalizeText(exercicio.repeticoes),
    normalizeNumber(exercicio.descanso, 0),
    normalizeText(exercicio.carga),
    normalizeText(exercicio.link_video),
    normalizeText(exercicio.observacoes),
    ignoreGroupId ? "" : normalizeText(exercicio.grupo_id),
    normalizeText(exercicio.tipo_agrupamento),
  ].join("|");
}

function sortExercises<T extends ExerciseLike>(exercicios: T[]) {
  return [...exercicios].sort((a, b) => {
    const ordem = normalizeNumber(a.ordem, 0) - normalizeNumber(b.ordem, 0);
    if (ordem !== 0) return ordem;
    return normalizeNumber(a.ordem_no_grupo, 0) - normalizeNumber(b.ordem_no_grupo, 0);
  });
}

export function normalizeExercises<T extends ExerciseLike>(
  exercicios: T[] | null | undefined
): T[] {
  const byId = new Map<string, number>();
  const bySignature = new Map<string, number>();
  const result: T[] = [];

  for (const exercicio of exercicios ?? []) {
    if (!exercicio) continue;

    const id = exercicio.id ? String(exercicio.id) : "";
    const signature = getExerciseSignature(exercicio);
    const existingIndex =
      (id && byId.get(id)) ?? bySignature.get(signature) ?? -1;

    if (existingIndex >= 0) {
      result[existingIndex] = mergeProgress(result[existingIndex], exercicio);
      continue;
    }

    const nextIndex = result.push(exercicio) - 1;
    if (id) byId.set(id, nextIndex);
    bySignature.set(signature, nextIndex);
  }

  return sortExercises(result);
}

function getGroupOrder(group: ExerciseGroupLike, index: number) {
  const exerciseOrders = (group.exercicios ?? [])
    .map((exercicio) => normalizeNumber(exercicio.ordem, Number.MAX_SAFE_INTEGER))
    .filter((ordem) => ordem !== Number.MAX_SAFE_INTEGER);

  if (exerciseOrders.length > 0) return Math.min(...exerciseOrders);
  return normalizeNumber(group.ordem, index);
}

function getGroupSignature(group: ExerciseGroupLike, index: number) {
  const exerciseSignature = (group.exercicios ?? [])
    .map((exercicio) =>
      getExerciseSignature(exercicio, {
        ignoreGroupId: true,
        ignoreOrder: true,
      })
    )
    .join(";");

  return [
    normalizeText(group.tipo_agrupamento),
    normalizeNumber(group.descanso_entre_grupos, 0),
    exerciseSignature,
  ].join("|");
}

function mergeGroups<T extends ExerciseGroupLike>(base: T, incoming: T): T {
  return {
    ...base,
    descanso_entre_grupos:
      base.descanso_entre_grupos ?? incoming.descanso_entre_grupos ?? null,
    exercicios: normalizeExercises([
      ...((base.exercicios ?? []) as any[]),
      ...((incoming.exercicios ?? []) as any[]),
    ]),
    ordem: Math.min(
      normalizeNumber(base.ordem, Number.MAX_SAFE_INTEGER),
      normalizeNumber(incoming.ordem, Number.MAX_SAFE_INTEGER)
    ),
  };
}

export function normalizeExerciseGroups<T extends ExerciseGroupLike>(
  grupos: T[] | null | undefined
): T[] {
  const byId = new Map<string, number>();
  const bySignature = new Map<string, number>();
  const result: T[] = [];

  (grupos ?? []).forEach((grupo, index) => {
    if (!grupo) return;

    const normalizedGroup = {
      ...grupo,
      exercicios: normalizeExercises(grupo.exercicios ?? []),
      ordem: getGroupOrder(grupo, index),
    } as T;

    const id = normalizedGroup.grupo_id ? String(normalizedGroup.grupo_id) : "";
    const signature = getGroupSignature(normalizedGroup, index);
    const existingIndex =
      (id && byId.get(id)) ?? bySignature.get(signature) ?? -1;

    if (existingIndex >= 0) {
      result[existingIndex] = mergeGroups(result[existingIndex], normalizedGroup);
      return;
    }

    const nextIndex = result.push(normalizedGroup) - 1;
    if (id) byId.set(id, nextIndex);
    bySignature.set(signature, nextIndex);
  });

  return [...result].sort(
    (a, b) => normalizeNumber(a.ordem, 0) - normalizeNumber(b.ordem, 0)
  );
}

function getBlockDuration(bloco: BlockLike) {
  return (
    bloco.config_cardio?.duracao_minutos ??
    bloco.config_alongamento?.duracao_minutos ??
    bloco.config_aquecimento?.duracao_minutos ??
    bloco.duracao_estimada_minutos ??
    0
  );
}

function getBlockSignature(bloco: BlockLike) {
  return [
    normalizeText(bloco.treino_semanal_id),
    normalizeText(bloco.posicao),
    normalizeText(bloco.tipo),
    normalizeText(bloco.nome),
    normalizeNumber(getBlockDuration(bloco), 0),
    Boolean(bloco.obrigatorio) ? "1" : "0",
    normalizeText(bloco.descricao),
    stableSerialize(bloco.config_cardio),
    stableSerialize(bloco.config_alongamento),
    stableSerialize(bloco.config_aquecimento),
    stableSerialize(bloco.config_outro),
    stableSerialize(bloco.links),
  ].join("|");
}

function sortBlocks<T extends BlockLike>(blocos: T[]) {
  return [...blocos].sort((a, b) => {
    const ordem = normalizeNumber(a.ordem, 0) - normalizeNumber(b.ordem, 0);
    if (ordem !== 0) return ordem;

    const posicao =
      (POSITION_ORDER[String(a.posicao ?? "")] ?? 99) -
      (POSITION_ORDER[String(b.posicao ?? "")] ?? 99);
    if (posicao !== 0) return posicao;

    return normalizeText(a.nome).localeCompare(normalizeText(b.nome));
  });
}

export function normalizeWorkoutBlocks<T extends BlockLike>(
  blocos: T[] | null | undefined
): T[] {
  const byId = new Map<string, number>();
  const bySignature = new Map<string, number>();
  const result: T[] = [];

  for (const bloco of blocos ?? []) {
    if (!bloco) continue;

    const id = bloco.id ? String(bloco.id) : "";
    const signature = getBlockSignature(bloco);
    const existingIndex =
      (id && byId.get(id)) ?? bySignature.get(signature) ?? -1;

    if (existingIndex >= 0) {
      result[existingIndex] = mergeProgress(result[existingIndex], bloco);
      continue;
    }

    const nextIndex = result.push(bloco) - 1;
    if (id) byId.set(id, nextIndex);
    bySignature.set(signature, nextIndex);
  }

  return sortBlocks(result);
}

export function getIsolatedExercises<T extends ExerciseLike>(
  exercicios: T[] | null | undefined
): T[] {
  return normalizeExercises(exercicios).filter((exercicio) => !exercicio.grupo_id);
}

export function buildOrderedWorkoutItems<
  TExercise extends ExerciseLike,
  TGroup extends ExerciseGroupLike<TExercise>,
  TBlock extends BlockLike
>(
  exerciciosIsolados: TExercise[] | null | undefined,
  grupos: TGroup[] | null | undefined,
  blocos: TBlock[] | null | undefined
): OrderedWorkoutItem<TExercise, TGroup, TBlock>[] {
  const items: OrderedWorkoutItem<TExercise, TGroup, TBlock>[] = [];

  getIsolatedExercises(exerciciosIsolados).forEach((exercicio, index) => {
    items.push({
      type: "exercise",
      ordem: normalizeNumber(exercicio.ordem, index + 1),
      data: exercicio,
    });
  });

  normalizeExerciseGroups(grupos).forEach((grupo, index) => {
    items.push({
      type: "group",
      ordem: normalizeNumber(grupo.ordem, index + 1),
      data: grupo,
    });
  });

  normalizeWorkoutBlocks(blocos).forEach((bloco, index) => {
    items.push({
      type: "block",
      ordem: normalizeNumber(bloco.ordem, index + 1),
      data: bloco,
    });
  });

  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ordem = a.item.ordem - b.item.ordem;
      if (ordem !== 0) return ordem;
      return a.index - b.index;
    })
    .map(({ item }) => item);
}
