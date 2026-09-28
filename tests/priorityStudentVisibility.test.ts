import { isStudentManuallyBlockedFromPriorities } from "../src/utils/priorityStudentVisibility.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nExpected: ${expected}\nActual: ${actual}`);
  }
}

Deno.test("manual pause and suspension are hidden from priorities", () => {
  assertEquals(
    isStudentManuallyBlockedFromPriorities({
      allowed: false,
      status: "pausado",
      source: "manual",
    }),
    true,
    "Paused student"
  );
  assertEquals(
    isStudentManuallyBlockedFromPriorities({
      allowed: false,
      status: "suspenso",
      source: "manual",
    }),
    true,
    "Suspended student"
  );
});

Deno.test("financially blocked students remain eligible for financial priorities", () => {
  assertEquals(
    isStudentManuallyBlockedFromPriorities({
      allowed: false,
      status: "pagamento_pendente",
      source: "payment",
    }),
    false,
    "Payment-blocked student"
  );
});

Deno.test("manual release remains visible when it has priority flags", () => {
  assertEquals(
    isStudentManuallyBlockedFromPriorities({
      allowed: true,
      status: "ativo",
      source: "manual",
    }),
    false,
    "Released student"
  );
});
