import {
  getNextConjugatedExerciseStep,
  usesRoundBasedProgression,
  type ConjugatedExerciseProgress,
} from "../src/utils/conjugatedExerciseProgress.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

function collectSequence(ids: string[], groupType: string, totalSeries = 3) {
  const exercises: ConjugatedExerciseProgress[] = ids.map((id) => ({
    id,
    series: totalSeries,
    series_concluidas: 0,
    concluido: false,
  }));
  const sequence: string[] = [];

  while (true) {
    const step = getNextConjugatedExerciseStep(exercises, groupType);
    if (!step) break;

    sequence.push(`${step.exerciseId}${step.round}`);
    const exercise = exercises[step.exerciseIndex];
    exercise.series_concluidas = step.round;
    exercise.concluido = step.round >= totalSeries;
  }

  return sequence;
}

Deno.test("Bi-set progresses exercise-by-exercise inside each round", () => {
  assertEquals(
    collectSequence(["A", "B"], "bi-set"),
    ["A1", "B1", "A2", "B2", "A3", "B3"],
    "Bi-set sequence"
  );
});

Deno.test("Tri-set progresses exercise-by-exercise inside each round", () => {
  assertEquals(
    collectSequence(["A", "B", "C"], "tri-set"),
    ["A1", "B1", "C1", "A2", "B2", "C2", "A3", "B3", "C3"],
    "Tri-set sequence"
  );
});

Deno.test("persisted counters resume at the first missing step of the round", () => {
  const persisted = JSON.stringify([
    { id: "A", series: 3, series_concluidas: 2 },
    { id: "B", series: 3, series_concluidas: 1 },
    { id: "C", series: 3, series_concluidas: 1 },
  ]);
  const step = getNextConjugatedExerciseStep(
    JSON.parse(persisted),
    "tri-set"
  );

  assertEquals(step, { exerciseId: "B", exerciseIndex: 1, round: 2 }, "Resume step");
});

Deno.test("completed exercises are never selected again", () => {
  const step = getNextConjugatedExerciseStep(
    [
      { id: "A", series: 3, series_concluidas: 3, concluido: true },
      { id: "B", series: 3, series_concluidas: 2 },
    ],
    "bi-set"
  );

  assertEquals(step, { exerciseId: "B", exerciseIndex: 1, round: 3 }, "Pending step");
  assertEquals(
    getNextConjugatedExerciseStep(
      [
        { id: "A", series: 3, series_concluidas: 3, concluido: true },
        { id: "B", series: 3, series_concluidas: 3, concluido: true },
      ],
      "bi-set"
    ),
    null,
    "Completed group"
  );
});

Deno.test("different series totals still finish each available round in order", () => {
  const exercises: ConjugatedExerciseProgress[] = [
    { id: "A", series: 3, series_concluidas: 2 },
    { id: "B", series: 2, series_concluidas: 2, concluido: true },
  ];

  assertEquals(
    getNextConjugatedExerciseStep(exercises, "bi-set"),
    { exerciseId: "A", exerciseIndex: 0, round: 3 },
    "Last available round"
  );
});

Deno.test("non Bi-set/Tri-set groups keep their existing progression", () => {
  assertEquals(usesRoundBasedProgression("normal"), false, "Normal exercise");
  assertEquals(usesRoundBasedProgression("drop-set"), false, "Drop-set");
  assertEquals(
    getNextConjugatedExerciseStep(
      [
        { id: "A", series: 3, series_concluidas: 0 },
        { id: "B", series: 3, series_concluidas: 0 },
      ],
      "normal"
    ),
    null,
    "Normal group"
  );
});
