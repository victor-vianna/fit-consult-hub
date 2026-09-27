export type StudentFinanceTone = "ok" | "pending" | "danger" | "neutral";

export type SubscriptionForFinanceStatus = {
  id: string;
  status_pagamento: string;
  data_pagamento?: string | null;
  data_expiracao: string;
  created_at?: string | null;
  updated_at?: string | null;
  access_revoked_at?: string | null;
};

export type AccessForFinanceStatus = {
  allowed: boolean;
  status: string;
  source: string;
  reason_code?: string | null;
  payment_required: boolean;
  has_active_payment: boolean;
  active_subscription_id?: string | null;
};

export type StudentFinanceSummary<T extends SubscriptionForFinanceStatus> = {
  status: string;
  tone: StudentFinanceTone;
  subscription: T | null;
  dueLabel: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(value?: string | null) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

function getLatestSubscription<T extends SubscriptionForFinanceStatus>(subscriptions: T[]) {
  return [...subscriptions].sort((a, b) => {
    const timeA = toTime(a.updated_at) || toTime(a.data_pagamento) || toTime(a.created_at);
    const timeB = toTime(b.updated_at) || toTime(b.data_pagamento) || toTime(b.created_at);
    return timeB - timeA;
  })[0] ?? null;
}

export function getStudentFinanceSummary<T extends SubscriptionForFinanceStatus>(
  subscriptions: T[],
  accessState: AccessForFinanceStatus | null,
  at = new Date()
): StudentFinanceSummary<T> {
  const now = at.getTime();
  const activeSubscriptions = subscriptions
    .filter((subscription) => {
      const paidStatus = ["pago", "cancelado", "canceled"].includes(
        subscription.status_pagamento
      );
      return (
        paidStatus &&
        !subscription.access_revoked_at &&
        toTime(subscription.data_expiracao) + DAY_MS > now
      );
    })
    .sort((a, b) => toTime(b.data_expiracao) - toTime(a.data_expiracao));

  const canonical = accessState?.active_subscription_id
    ? activeSubscriptions.find((subscription) => subscription.id === accessState.active_subscription_id)
    : null;
  const active = canonical ?? activeSubscriptions[0] ?? null;
  const latest = active ?? getLatestSubscription(subscriptions);

  // A confirmed payment must remain visible even when access-by-payment is
  // disabled or a human suspension currently controls the student's access.
  if (active) {
    const inGrace = toTime(active.data_expiracao) <= now;
    const canceled = ["cancelado", "canceled"].includes(active.status_pagamento);
    return {
      status: inGrace
        ? "Carência de 24h"
        : canceled
        ? "Período pago ativo"
        : "Pagamento em dia",
      tone: inGrace ? "pending" : "ok",
      subscription: active,
      dueLabel: inGrace ? "Venceu em" : "Vence em",
    };
  }

  if (accessState?.allowed && accessState.source === "manual") {
    return {
      status: "Liberação manual",
      tone: "pending",
      subscription: latest,
      dueLabel: "Sem pagamento ativo",
    };
  }

  if (accessState && !accessState.payment_required) {
    return {
      status: "Acesso sem cobrança",
      tone: "neutral",
      subscription: latest,
      dueLabel: "Pagamento não exigido",
    };
  }

  if (!latest) {
    return {
      status: "Pagamento pendente",
      tone: "danger",
      subscription: null,
      dueLabel: "Sem vencimento cadastrado",
    };
  }

  if (latest.access_revoked_at) {
    return {
      status: "Pagamento revogado",
      tone: "danger",
      subscription: latest,
      dueLabel: "Estorno ou contestação registrada",
    };
  }

  const expired = toTime(latest.data_expiracao) + DAY_MS <= now;
  return {
    status: expired ? "Pagamento vencido" : "Pagamento pendente",
    tone: expired ? "danger" : "pending",
    subscription: latest,
    dueLabel: expired ? "Venceu em" : "Vence em",
  };
}

export function getStudentAccessHeadline(
  state: Pick<AccessForFinanceStatus, "allowed" | "status"> | null,
  loading = false
) {
  if (loading || !state) return { label: "Verificando acesso", tone: "neutral" as const };
  if (state.allowed) {
    return {
      label: state.status === "carencia" ? "Acesso liberado em carência" : "Acesso liberado",
      tone: "ok" as const,
    };
  }
  if (state.status === "pausado") return { label: "Acesso pausado", tone: "danger" as const };
  if (state.status === "pagamento_pendente") {
    return { label: "Acesso bloqueado", tone: "danger" as const };
  }
  return { label: "Acesso suspenso", tone: "danger" as const };
}
