import { parseSubscriptionAccessProblem } from "../src/lib/subscriptionAccess.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${
        JSON.stringify(actual)
      }`,
    );
  }
}

Deno.test("PostgREST subscription expiration error keeps the plans redirect context", () => {
  const problem = parseSubscriptionAccessProblem({
    code: "42501",
    message: "SUBSCRIPTION_EXPIRED",
    details: JSON.stringify({
      code: "SUBSCRIPTION_EXPIRED",
      reason_code: "expired",
      plans_path: "/planos/personal-demo",
      expires_at: "2026-09-28T12:00:00Z",
    }),
  });

  assertEquals(
    problem,
    {
      code: "SUBSCRIPTION_EXPIRED",
      reason_code: "expired",
      reason: null,
      plans_path: "/planos/personal-demo",
      expires_at: "2026-09-28T12:00:00Z",
    },
    "Expired access response",
  );
});

Deno.test("PostgREST suspension error is still recognized on an empty data query", () => {
  const problem = parseSubscriptionAccessProblem({
    code: "42501",
    message: "ACCESS_SUSPENDED",
    details: JSON.stringify({
      code: "ACCESS_SUSPENDED",
      reason_code: "manual_suspension",
    }),
  });

  assertEquals(
    problem,
    {
      code: "ACCESS_SUSPENDED",
      reason_code: "manual_suspension",
      reason: null,
      plans_path: null,
      expires_at: null,
    },
    "Suspended access response",
  );
});
