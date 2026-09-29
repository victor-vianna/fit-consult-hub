import { getSubscriptionLifecycleAlert } from "../src/utils/subscriptionLifecycleNotifications.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

const at = new Date("2026-09-28T12:00:00-03:00");

Deno.test("active paid period suppresses alerts from historical expired periods", () => {
  const alert = getSubscriptionLifecycleAlert(
    [
      {
        id: "current",
        status_pagamento: "pago",
        data_expiracao: "2026-12-21T00:00:00-03:00",
        updated_at: "2026-09-22T18:22:05-03:00",
      },
      {
        id: "historical",
        status_pagamento: "pago",
        data_expiracao: "2026-08-31T00:00:00-03:00",
        updated_at: "2026-07-29T23:46:52-03:00",
      },
    ],
    at
  );

  assertEquals(alert, null, "Historical plan must not notify");
});

Deno.test("only the relevant active period generates an expiration warning", () => {
  const alert = getSubscriptionLifecycleAlert(
    [
      {
        id: "ends-sooner",
        status_pagamento: "pago",
        data_expiracao: "2026-09-29T00:00:00-03:00",
      },
      {
        id: "covers-longer",
        status_pagamento: "pago",
        data_expiracao: "2026-10-03T00:00:00-03:00",
      },
    ],
    at
  );

  assertEquals(
    alert && {
      kind: alert.kind,
      subscriptionId: alert.subscription.id,
      days: alert.daysUntilExpiration,
    },
    { kind: "expiring", subscriptionId: "covers-longer", days: 5 },
    "Longest active coverage should drive the warning"
  );
});

Deno.test("latest expired paid period generates one expired alert", () => {
  const alert = getSubscriptionLifecycleAlert(
    [
      {
        id: "older",
        status_pagamento: "pago",
        data_expiracao: "2026-05-16T00:00:00-03:00",
        updated_at: "2026-05-16T12:00:00-03:00",
      },
      {
        id: "latest",
        status_pagamento: "pago",
        data_expiracao: "2026-08-31T00:00:00-03:00",
        updated_at: "2026-08-31T12:00:00-03:00",
      },
    ],
    at
  );

  assertEquals(
    alert && { kind: alert.kind, subscriptionId: alert.subscription.id },
    { kind: "expired", subscriptionId: "latest" },
    "Only the latest expired period should notify"
  );
});

Deno.test("newer pending period suppresses stale expired paid alerts", () => {
  const alert = getSubscriptionLifecycleAlert(
    [
      {
        id: "pending",
        status_pagamento: "pendente",
        data_expiracao: "2026-10-28T00:00:00-03:00",
        updated_at: "2026-09-28T08:00:00-03:00",
      },
      {
        id: "historical",
        status_pagamento: "pago",
        data_expiracao: "2026-08-31T00:00:00-03:00",
        updated_at: "2026-08-31T12:00:00-03:00",
      },
    ],
    at
  );

  assertEquals(alert, null, "Stale paid period must not override a newer state");
});
