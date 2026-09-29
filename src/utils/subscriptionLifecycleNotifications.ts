export type SubscriptionForLifecycleNotification = {
  id: string;
  status_pagamento: string;
  data_expiracao: string;
  data_pagamento?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  access_revoked_at?: string | null;
};

export type SubscriptionLifecycleAlert<T extends SubscriptionForLifecycleNotification> = {
  kind: "expired" | "expiring";
  subscription: T;
  daysUntilExpiration: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function toTime(value?: string | null) {
  const time = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
}

function getReferenceTime(subscription: SubscriptionForLifecycleNotification) {
  return (
    toTime(subscription.updated_at) ||
    toTime(subscription.data_pagamento) ||
    toTime(subscription.created_at) ||
    toTime(subscription.data_expiracao)
  );
}

function getDaysUntilExpiration(value: string, at: Date) {
  const expiration = new Date(value);
  if (!Number.isFinite(expiration.getTime())) return null;

  const today = new Date(at);
  today.setHours(0, 0, 0, 0);
  expiration.setHours(0, 0, 0, 0);

  return Math.ceil((expiration.getTime() - today.getTime()) / DAY_MS);
}

/**
 * Selects at most one lifecycle alert for the subscription that currently
 * represents the student's financial situation. Historical paid periods must
 * not generate alerts while a newer paid period is still active.
 */
export function getSubscriptionLifecycleAlert<
  T extends SubscriptionForLifecycleNotification,
>(subscriptions: T[], at = new Date()): SubscriptionLifecycleAlert<T> | null {
  const paidSubscriptions = subscriptions
    .map((subscription) => ({
      subscription,
      daysUntilExpiration: getDaysUntilExpiration(subscription.data_expiracao, at),
    }))
    .filter(
      (item): item is { subscription: T; daysUntilExpiration: number } =>
        item.subscription.status_pagamento === "pago" &&
        !item.subscription.access_revoked_at &&
        item.daysUntilExpiration !== null
    );

  const active = paidSubscriptions
    .filter((item) => item.daysUntilExpiration >= 0)
    .sort((a, b) => b.daysUntilExpiration - a.daysUntilExpiration)[0];

  if (active) {
    if (active.daysUntilExpiration > 7) return null;

    return {
      kind: "expiring",
      subscription: active.subscription,
      daysUntilExpiration: active.daysUntilExpiration,
    };
  }

  const latest = [...subscriptions].sort(
    (a, b) => getReferenceTime(b) - getReferenceTime(a)
  )[0];
  if (
    !latest ||
    latest.status_pagamento !== "pago" ||
    latest.access_revoked_at
  ) {
    return null;
  }

  const daysUntilExpiration = getDaysUntilExpiration(latest.data_expiracao, at);
  if (daysUntilExpiration === null || daysUntilExpiration >= 0) return null;

  return {
    kind: "expired",
    subscription: latest,
    daysUntilExpiration,
  };
}
