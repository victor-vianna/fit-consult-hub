/// <reference lib="deno.ns" />

import {
  assembleWorkoutWeek,
  buildGroupsFromExercises,
  type WorkoutBlockRow,
} from "../src/utils/workoutWeekAssembly.ts";
import type { BlocoTreino } from "../src/types/workoutBlocks.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${
        JSON.stringify(actual)
      }`,
    );
  }
}

const hidratarBloco = (bloco: WorkoutBlockRow) =>
  ({ ...bloco, hidratado: true }) as unknown as BlocoTreino;

Deno.test("empty workout week produces seven placeholders", () => {
  const semana = assembleWorkoutWeek({
    treinosSemanais: [],
    exercicios: [],
    blocos: [],
    hidratarBloco,
  });

  assertEquals(semana.length, 7, "Placeholder count");
  assertEquals(
    semana.map((treino) => ({ dia: treino.dia, treinoId: treino.treinoId })),
    Array.from({ length: 7 }, (_, index) => ({
      dia: index + 1,
      treinoId: null,
    })),
    "Placeholder days",
  );
});

Deno.test("multiple workouts on the same day follow ordem_no_dia", () => {
  const semana = assembleWorkoutWeek({
    treinosSemanais: [
      { id: "treino-2", dia_semana: 3, ordem_no_dia: 2 },
      { id: "treino-1", dia_semana: 3, ordem_no_dia: 1 },
    ],
    exercicios: [],
    blocos: [],
    hidratarBloco,
  });

  assertEquals(
    semana.filter((treino) => treino.dia === 3).map((treino) =>
      treino.treinoId
    ),
    ["treino-1", "treino-2"],
    "Workout order for the same day",
  );
});

Deno.test("exercises stay in their workout and respect order", () => {
  const semana = assembleWorkoutWeek({
    treinosSemanais: [
      { id: "treino-a", dia_semana: 1 },
      { id: "treino-b", dia_semana: 2 },
    ],
    exercicios: [
      { id: "a-2", treino_semanal_id: "treino-a", nome: "A2", ordem: 2 },
      { id: "b-1", treino_semanal_id: "treino-b", nome: "B1", ordem: 1 },
      { id: "a-1", treino_semanal_id: "treino-a", nome: "A1", ordem: 1 },
    ],
    blocos: [],
    hidratarBloco,
  });

  const treinoA = semana.find((treino) => treino.treinoId === "treino-a");
  const treinoB = semana.find((treino) => treino.treinoId === "treino-b");
  assertEquals(
    treinoA?.exercicios.map((exercicio) => exercicio.id),
    ["a-1", "a-2"],
    "Exercises from workout A",
  );
  assertEquals(
    treinoB?.exercicios.map((exercicio) => exercicio.id),
    ["b-1"],
    "Exercises from workout B",
  );
});

Deno.test("grouped exercises preserve type, rest and group order", () => {
  const grupos = buildGroupsFromExercises([
    {
      id: "ex-2",
      treino_semanal_id: "treino-a",
      grupo_id: "grupo-1",
      tipo_agrupamento: "bi-set",
      descanso_entre_grupos: 75,
      ordem: 3,
      ordem_no_grupo: 2,
    },
    {
      id: "ex-1",
      treino_semanal_id: "treino-a",
      grupo_id: "grupo-1",
      tipo_agrupamento: "bi-set",
      descanso_entre_grupos: 75,
      ordem: 3,
      ordem_no_grupo: 1,
    },
  ]);

  assertEquals(grupos["treino-a"][0].tipo_agrupamento, "bi-set", "Group type");
  assertEquals(
    grupos["treino-a"][0].descanso_entre_grupos,
    75,
    "Rest between groups",
  );
  assertEquals(
    grupos["treino-a"][0].exercicios.map((exercicio) => exercicio.id),
    ["ex-1", "ex-2"],
    "Exercise order inside group",
  );
});

Deno.test("blocks stay associated with their workout", () => {
  const semana = assembleWorkoutWeek({
    treinosSemanais: [
      { id: "treino-a", dia_semana: 1 },
      { id: "treino-b", dia_semana: 2 },
    ],
    exercicios: [],
    blocos: [
      {
        id: "bloco-b",
        treino_semanal_id: "treino-b",
        ordem: 1,
        tipo: "cardio",
        posicao: "fim",
        nome: "Bike",
      },
      {
        id: "bloco-a",
        treino_semanal_id: "treino-a",
        ordem: 1,
        tipo: "aquecimento",
        posicao: "inicio",
        nome: "Aquecimento",
      },
    ],
    hidratarBloco,
  });

  const treinoA = semana.find((treino) => treino.treinoId === "treino-a");
  const treinoB = semana.find((treino) => treino.treinoId === "treino-b");
  assertEquals(
    treinoA?.blocos?.map((bloco) => bloco.id),
    ["bloco-a"],
    "Blocks A",
  );
  assertEquals(
    treinoB?.blocos?.map((bloco) => bloco.id),
    ["bloco-b"],
    "Blocks B",
  );
});

Deno.test("null exercise values receive the existing defaults", () => {
  const semana = assembleWorkoutWeek({
    treinosSemanais: [{ id: "treino-a", dia_semana: 1 }],
    exercicios: [
      {
        id: "ex-1",
        treino_semanal_id: "treino-a",
        nome: "Agachamento",
        ordem: 1,
        series: null,
        repeticoes: null,
        descanso: null,
      },
    ],
    blocos: [],
    hidratarBloco,
  });

  const exercicio = semana[0].exercicios[0];
  assertEquals(
    {
      series: exercicio.series,
      repeticoes: exercicio.repeticoes,
      descanso: exercicio.descanso,
    },
    { series: 3, repeticoes: "12", descanso: 60 },
    "Exercise defaults",
  );
});
