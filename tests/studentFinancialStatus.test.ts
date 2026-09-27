import {
  getStudentAccessHeadline,
  getStudentFinanceSummary,
} from "../src/utils/studentFinancialStatus.ts";

function assertEquals<T>(actual: T, expected: T, message: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(
      `${message}\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`
    );
  }
}

const paidSubscription = {
  id: "subscription-paid",
  status_pagamento: "pago",
  data_pagamento: "2026-09-27T12:00:00Z",
  data_expiracao: "2026-10-08T12:00:00Z",
  created_at: "2026-09-27T12:00:00Z",
};

Deno.test("registered payment outranks the no-charge display rule", () => {
  const summary = getStudentFinanceSummary(
    [paidSubscription],
    {
      allowed: true,
      status: "ativo",
      source: "settings",
      payment_required: false,
      has_active_payment: false,
      active_subscription_id: null,
    },
    new Date("2026-09-28T12:00:00Z")
  );

  assertEquals(summary.status, "Pagamento em dia", "Paid status");
  assertEquals(summary.tone, "ok", "Paid tone");
});

Deno.test("manual suspension keeps paid finance status but access remains red", () => {
  const state = {
    allowed: false,
    status: "suspenso",
    source: "manual",
    payment_required: true,
    has_active_payment: true,
    active_subscription_id: paidSubscription.id,
  };

  assertEquals(
    getStudentFinanceSummary([paidSubscription], state, new Date("2026-09-28T12:00:00Z")).status,
    "Pagamento em dia",
    "Financial status"
  );
  assertEquals(
    getStudentAccessHeadline(state),
    { label: "Acesso suspenso", tone: "danger" },
    "Access presentation"
  );
});

Deno.test("no-charge label is used only when no active payment exists", () => {
  const summary = getStudentFinanceSummary(
    [],
    {
      allowed: true,
      status: "ativo",
      source: "settings",
      payment_required: false,
      has_active_payment: false,
      active_subscription_id: null,
    },
    new Date("2026-09-28T12:00:00Z")
  );

  assertEquals(summary.status, "Acesso sem cobrança", "No-charge status");
  assertEquals(getStudentAccessHeadline({ allowed: true, status: "ativo" }).tone, "ok", "Access tone");
});

Deno.test("grace keeps access green while payment indicator becomes amber", () => {
  const summary = getStudentFinanceSummary(
    [{ ...paidSubscription, data_expiracao: "2026-09-28T00:00:00Z" }],
    {
      allowed: true,
      status: "ativo",
      source: "payment",
      payment_required: true,
      has_active_payment: true,
      active_subscription_id: paidSubscription.id,
    },
    new Date("2026-09-28T12:00:00Z")
  );

  assertEquals(summary.status, "Carência de 24h", "Grace payment status");
  assertEquals(summary.tone, "pending", "Grace finance tone");
  assertEquals(getStudentAccessHeadline({ allowed: true, status: "ativo" }).tone, "ok", "Allowed access tone");
});

Deno.test("blocked and paused states always use the red access tone", () => {
  assertEquals(
    getStudentAccessHeadline({ allowed: false, status: "pagamento_pendente" }),
    { label: "Acesso bloqueado", tone: "danger" },
    "Blocked access"
  );
  assertEquals(
    getStudentAccessHeadline({ allowed: false, status: "pausado" }),
    { label: "Acesso pausado", tone: "danger" },
    "Paused access"
  );
});
