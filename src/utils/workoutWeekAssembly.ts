import type { Exercicio, TreinoDia } from "../types/treino.ts";
import type { BlocoTreino } from "../types/workoutBlocks.ts";
import { getValidVideoReferences } from "./videoLinks.ts";
import {
  normalizeExerciseGroups,
  normalizeExercises,
  normalizeWorkoutBlocks,
} from "./workoutNormalization.ts";

export type TipoAgrupamento =
  | "normal"
  | "bi-set"
  | "tri-set"
  | "drop-set"
  | "superset"
  | "circuito";

export interface GrupoExercicio {
  grupo_id: string;
  tipo_agrupamento: TipoAgrupamento;
  descanso_entre_grupos?: number | null;
  ordem: number;
  // Preserva o contrato legado: o grupo expõe a linha completa de exercício.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exercicios: any[];
}

export interface WorkoutRow {
  id: string;
  dia_semana: number;
  ordem_no_dia?: number | null;
  descricao?: string | null;
  concluido?: boolean | null;
  nome_treino?: string | null;
}

export interface WorkoutExerciseRow {
  id: string;
  treino_semanal_id: string | null;
  nome?: string | null;
  link_video?: string | null;
  links_demonstracao?: unknown;
  ordem?: number | null;
  ordem_no_grupo?: number | null;
  series?: number | null;
  series_concluidas?: number | null;
  repeticoes?: string | null;
  descanso?: number | null;
  descanso_entre_grupos?: number | null;
  carga?: string | number | null;
  peso_executado?: string | null;
  observacoes?: string | null;
  concluido?: boolean | null;
  grupo_id?: string | null;
  tipo_agrupamento?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

export interface WorkoutBlockRow {
  id: string;
  treino_semanal_id: string | null;
  ordem?: number | null;
  tipo?: string | null;
  posicao?: string | null;
  nome?: string | null;
  descricao?: string | null;
  duracao_estimada_minutos?: number | null;
  obrigatorio?: boolean | null;
  config_cardio?: unknown;
  config_alongamento?: unknown;
  config_aquecimento?: unknown;
  config_outro?: unknown;
  links?: unknown;
  concluido?: boolean | null;
  concluido_em?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  deleted_at?: string | null;
}

type MergeExerciseProgress = <T extends { id: string; concluido?: boolean }>(
  exercicios: T[],
) => T[];

interface AssembleWorkoutWeekParams {
  treinosSemanais: WorkoutRow[] | null | undefined;
  exercicios: WorkoutExerciseRow[] | null | undefined;
  blocos: WorkoutBlockRow[] | null | undefined;
  hidratarBloco: (bloco: WorkoutBlockRow) => BlocoTreino;
  mesclarProgressoExercicios?: MergeExerciseProgress;
}

const numberOr = (value: unknown, fallback: number): number => {
  if (value == null) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const cargaFromDb = (value: unknown): string | null =>
  value == null ? null : String(value);

function buildEmptyDay(dia: number): TreinoDia {
  return {
    dia,
    treinoId: null,
    exercicios: [],
    grupos: [],
    descricao: null,
    concluido: false,
    nome_treino: undefined,
    ordem_no_dia: 1,
  };
}

export function buildGroupsFromExercises(
  exercicios: WorkoutExerciseRow[] | null | undefined,
): Record<string, GrupoExercicio[]> {
  const gruposPorTreino: Record<string, GrupoExercicio[]> = {};

  for (const exercicio of exercicios ?? []) {
    const treinoId = exercicio.treino_semanal_id == null
      ? ""
      : String(exercicio.treino_semanal_id);
    const grupoId = exercicio.grupo_id == null
      ? ""
      : String(exercicio.grupo_id);
    if (!treinoId || !grupoId) continue;

    if (!gruposPorTreino[treinoId]) gruposPorTreino[treinoId] = [];

    let grupo = gruposPorTreino[treinoId].find(
      (item) => item.grupo_id === grupoId,
    );
    if (!grupo) {
      grupo = {
        grupo_id: grupoId,
        tipo_agrupamento: (exercicio.tipo_agrupamento as TipoAgrupamento) ||
          "normal",
        descanso_entre_grupos: exercicio.descanso_entre_grupos ?? null,
        ordem: exercicio.ordem ?? Number.MAX_SAFE_INTEGER,
        exercicios: [],
      };
      gruposPorTreino[treinoId].push(grupo);
    }

    grupo.exercicios.push(exercicio);
    const ordemAtual = exercicio.ordem ?? Number.MAX_SAFE_INTEGER;
    if (ordemAtual < grupo.ordem) grupo.ordem = ordemAtual;
  }

  for (const treinoId of Object.keys(gruposPorTreino)) {
    gruposPorTreino[treinoId] = normalizeExerciseGroups(
      gruposPorTreino[treinoId],
    ) as GrupoExercicio[];
  }

  return gruposPorTreino;
}

function mapExercise(exercicio: WorkoutExerciseRow): Exercicio {
  return {
    id: String(exercicio.id),
    treino_semanal_id: exercicio.treino_semanal_id != null
      ? String(exercicio.treino_semanal_id)
      : null,
    nome: String(exercicio.nome ?? ""),
    link_video: exercicio.link_video ?? null,
    links_demonstracao: getValidVideoReferences(
      exercicio.links_demonstracao,
      exercicio.link_video,
    ),
    ordem: typeof exercicio.ordem === "number"
      ? exercicio.ordem
      : numberOr(exercicio.ordem, 0),
    ordem_no_grupo: exercicio.ordem_no_grupo != null
      ? numberOr(exercicio.ordem_no_grupo, 0)
      : null,
    series: exercicio.series != null ? numberOr(exercicio.series, 3) : 3,
    series_concluidas: exercicio.series_concluidas != null
      ? numberOr(exercicio.series_concluidas, 0)
      : 0,
    repeticoes: exercicio.repeticoes ?? "12",
    descanso: exercicio.descanso != null
      ? numberOr(exercicio.descanso, 60)
      : 60,
    descanso_entre_grupos: exercicio.descanso_entre_grupos != null
      ? numberOr(exercicio.descanso_entre_grupos, 0)
      : null,
    carga: cargaFromDb(exercicio.carga),
    peso_executado: exercicio.peso_executado ?? null,
    observacoes: exercicio.observacoes ?? null,
    concluido: Boolean(exercicio.concluido),
    grupo_id: exercicio.grupo_id ?? null,
    tipo_agrupamento: exercicio.tipo_agrupamento ?? null,
    created_at: exercicio.created_at ?? null,
    updated_at: exercicio.updated_at ?? null,
    deleted_at: exercicio.deleted_at ?? null,
  };
}

export function assembleWorkoutWeek({
  treinosSemanais,
  exercicios,
  blocos,
  hidratarBloco,
  mesclarProgressoExercicios = (items) => items,
}: AssembleWorkoutWeekParams): TreinoDia[] {
  const exerciciosPorTreino = new Map<string, WorkoutExerciseRow[]>();
  for (const exercicio of exercicios ?? []) {
    if (exercicio.treino_semanal_id == null) continue;
    const treinoId = String(exercicio.treino_semanal_id);
    const atuais = exerciciosPorTreino.get(treinoId) ?? [];
    atuais.push(exercicio);
    exerciciosPorTreino.set(treinoId, atuais);
  }

  const blocosPorTreino = new Map<string, WorkoutBlockRow[]>();
  for (const bloco of blocos ?? []) {
    if (bloco.treino_semanal_id == null) continue;
    const treinoId = String(bloco.treino_semanal_id);
    const atuais = blocosPorTreino.get(treinoId) ?? [];
    atuais.push(bloco);
    blocosPorTreino.set(treinoId, atuais);
  }

  const gruposPorTreino = buildGroupsFromExercises(exercicios);
  const treinosPorDia = new Map<number, WorkoutRow[]>();
  const treinosOrdenados = [...(treinosSemanais ?? [])].sort((a, b) => {
    const dia = numberOr(a.dia_semana, 0) - numberOr(b.dia_semana, 0);
    if (dia !== 0) return dia;
    return numberOr(a.ordem_no_dia, 1) - numberOr(b.ordem_no_dia, 1);
  });

  for (const treino of treinosOrdenados) {
    const dia = numberOr(treino.dia_semana, 0);
    if (dia < 1 || dia > 7) continue;
    const atuais = treinosPorDia.get(dia) ?? [];
    atuais.push(treino);
    treinosPorDia.set(dia, atuais);
  }

  const semanaMontada: TreinoDia[] = [];
  for (let dia = 1; dia <= 7; dia += 1) {
    const treinosDoDia = treinosPorDia.get(dia) ?? [];
    if (treinosDoDia.length === 0) {
      semanaMontada.push(buildEmptyDay(dia));
      continue;
    }

    for (const treino of treinosDoDia) {
      const treinoId = String(treino.id);
      const exerciciosMapeados = (exerciciosPorTreino.get(treinoId) ?? []).map(
        mapExercise,
      );
      const exerciciosTipados = normalizeExercises(
        mesclarProgressoExercicios(exerciciosMapeados),
      ) as Exercicio[];
      const blocosHidratados = normalizeWorkoutBlocks(
        (blocosPorTreino.get(treinoId) ?? []).map(hidratarBloco),
      );

      semanaMontada.push({
        dia,
        treinoId: treino.id,
        exercicios: exerciciosTipados,
        grupos: normalizeExerciseGroups(gruposPorTreino[treinoId] ?? []),
        blocos: blocosHidratados,
        descricao: treino.descricao ?? null,
        concluido: Boolean(treino.concluido),
        nome_treino: treino.nome_treino || undefined,
        ordem_no_dia: treino.ordem_no_dia || 1,
      });
    }
  }

  return semanaMontada;
}
