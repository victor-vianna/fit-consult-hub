import {
  shouldShowWorkoutBlockingLoader,
  shouldShowWorkoutLoadError,
} from "../src/utils/workoutLoading.ts";

function assertEquals(actual: boolean, expected: boolean, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${expected}, received ${actual}`);
  }
}

Deno.test("new week without data blocks the screen while loading", () => {
  assertEquals(
    shouldShowWorkoutBlockingLoader({
      hasLoadedOnce: false,
      isInitialLoading: true,
    }),
    true,
    "First load decision",
  );
});

Deno.test("revalidation with current week data keeps the screen mounted", () => {
  assertEquals(
    shouldShowWorkoutBlockingLoader({
      hasLoadedOnce: true,
      isInitialLoading: false,
    }),
    false,
    "Background revalidation decision",
  );
});

Deno.test("error with current week data does not show the error screen", () => {
  assertEquals(
    shouldShowWorkoutLoadError({
      hasData: true,
      hasError: true,
    }),
    false,
    "Background error decision",
  );
});

Deno.test("error without current week data shows the error screen", () => {
  assertEquals(
    shouldShowWorkoutLoadError({
      hasData: false,
      hasError: true,
    }),
    true,
    "Initial error decision",
  );
});
