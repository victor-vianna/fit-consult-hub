import {
  backgroundErrorKeepsScreen,
  shouldShowBlockingLoader,
  shouldStartBackgroundCheck,
} from "../src/utils/accessRevalidation.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

Deno.test("shows the blocking loader only before the first access check", () => {
  assertEquals(
    shouldShowBlockingLoader({
      firstCheckDone: false,
      authLoading: false,
      checkingAccess: true,
    }),
    true,
    "Loader before the first check"
  );

  assertEquals(
    shouldShowBlockingLoader({
      firstCheckDone: true,
      authLoading: false,
      checkingAccess: true,
    }),
    false,
    "No loader during a later access check"
  );

  assertEquals(
    shouldShowBlockingLoader({
      firstCheckDone: true,
      authLoading: true,
      checkingAccess: false,
    }),
    false,
    "No loader during a later auth refresh"
  );
});

Deno.test("deduplicates and throttles background access checks", () => {
  const minIntervalMs = 15_000;

  assertEquals(
    shouldStartBackgroundCheck({
      now: 20_000,
      lastCheckAt: 0,
      inFlight: true,
      minIntervalMs,
    }),
    false,
    "Do not start while another check is in flight"
  );

  assertEquals(
    shouldStartBackgroundCheck({
      now: 20_000,
      lastCheckAt: 15_000,
      inFlight: false,
      minIntervalMs,
    }),
    false,
    "Do not start five seconds after the last check"
  );

  assertEquals(
    shouldStartBackgroundCheck({
      now: 31_000,
      lastCheckAt: 15_000,
      inFlight: false,
      minIntervalMs,
    }),
    true,
    "Start sixteen seconds after the last check"
  );

  assertEquals(
    shouldStartBackgroundCheck({
      now: 1_000,
      lastCheckAt: 0,
      inFlight: false,
      minIntervalMs,
    }),
    true,
    "Allow the first background check"
  );
});

Deno.test("a background error keeps the current screen mounted", () => {
  assertEquals(
    backgroundErrorKeepsScreen(),
    true,
    "Background errors preserve the last authorized screen"
  );
});
