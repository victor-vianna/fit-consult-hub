export interface ConjugatedExerciseProgress {
  id: string;
  series?: number | null;
  series_concluidas?: number | null;
  concluido?: boolean;
}

export interface ConjugatedExerciseStep {
  exerciseId: string;
  exerciseIndex: number;
  round: number;
}

const ROUND_BASED_GROUP_TYPES = new Set(["bi-set", "tri-set"]);

export function usesRoundBasedProgression(groupType: string | null | undefined) {
  return ROUND_BASED_GROUP_TYPES.has(String(groupType ?? "").trim().toLowerCase());
}

export function getExerciseTotalSeries(exercise: ConjugatedExerciseProgress) {
  const parsed = Number(exercise.series);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 3;
}

export function getExerciseCompletedSeries(exercise: ConjugatedExerciseProgress) {
  const totalSeries = getExerciseTotalSeries(exercise);
  if (exercise.concluido) return totalSeries;

  const parsed = Number(exercise.series_concluidas ?? 0);
  const completedSeries = Number.isFinite(parsed) ? Math.floor(parsed) : 0;
  return Math.min(Math.max(0, completedSeries), totalSeries);
}

/**
 * Returns the next executable step of a Bi-set/Tri-set.
 *
 * The search is round-first and exercise-second, so persisted per-exercise
 * counters naturally produce A1 -> B1 -> A2 -> B2 instead of A1 -> A2.
 */
export function getNextConjugatedExerciseStep(
  exercises: ConjugatedExerciseProgress[],
  groupType: string | null | undefined
): ConjugatedExerciseStep | null {
  if (!usesRoundBasedProgression(groupType) || exercises.length === 0) return null;

  const progress = exercises.map((exercise) => ({
    totalSeries: getExerciseTotalSeries(exercise),
    completedSeries: getExerciseCompletedSeries(exercise),
  }));
  const totalRounds = Math.max(...progress.map((item) => item.totalSeries));

  for (let round = 1; round <= totalRounds; round += 1) {
    for (let exerciseIndex = 0; exerciseIndex < exercises.length; exerciseIndex += 1) {
      const item = progress[exerciseIndex];
      if (item.totalSeries >= round && item.completedSeries < round) {
        return {
          exerciseId: exercises[exerciseIndex].id,
          exerciseIndex,
          round,
        };
      }
    }
  }

  return null;
}
