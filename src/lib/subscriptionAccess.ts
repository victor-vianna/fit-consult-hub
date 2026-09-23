export type SubscriptionAccessErrorCode =
  | "SUBSCRIPTION_EXPIRED"
  | "ACCESS_SUSPENDED";

export type SubscriptionAccessProblem = {
  code: SubscriptionAccessErrorCode;
  reason_code?: string | null;
  reason?: string | null;
  plans_path?: string | null;
  expires_at?: string | null;
};

const ACCESS_STORAGE_KEY = "fitconsult:subscription-access-problem";
const RECOVERY_PATHS = [
  "/auth",
  "/reset-password",
  "/acesso-suspenso",
  "/planos/",
  "/p/",
];

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function parseObject(value: unknown): Record<string, unknown> | null {
  const object = asObject(value);
  if (object) return object;
  if (typeof value !== "string") return null;

  try {
    return asObject(JSON.parse(value));
  } catch {
    return null;
  }
}

export function parseSubscriptionAccessProblem(
  payload: unknown
): SubscriptionAccessProblem | null {
  const root = parseObject(payload);
  if (!root) return null;

  const candidates = [
    root,
    parseObject(root.details),
    parseObject(root.error),
    parseObject(asObject(root.error)?.details),
  ].filter(Boolean) as Record<string, unknown>[];

  for (const candidate of candidates) {
    const code = candidate.code ?? candidate.message;
    if (code !== "SUBSCRIPTION_EXPIRED" && code !== "ACCESS_SUSPENDED") {
      continue;
    }

    return {
      code,
      reason_code:
        typeof candidate.reason_code === "string" ? candidate.reason_code : null,
      reason: typeof candidate.reason === "string" ? candidate.reason : null,
      plans_path:
        typeof candidate.plans_path === "string" ? candidate.plans_path : null,
      expires_at:
        typeof candidate.expires_at === "string" ? candidate.expires_at : null,
    };
  }

  return null;
}

function isRecoveryPath(pathname: string) {
  return RECOVERY_PATHS.some((path) =>
    path.endsWith("/") ? pathname.startsWith(path) : pathname === path
  );
}

function safePlansPath(value?: string | null) {
  if (!value) return null;
  return value.startsWith("/planos/") || value.startsWith("/p/") ? value : null;
}

export function redirectForSubscriptionAccess(problem: SubscriptionAccessProblem) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(ACCESS_STORAGE_KEY, JSON.stringify(problem));
  } catch {
    // Storage can be disabled without affecting enforcement.
  }

  if (isRecoveryPath(window.location.pathname)) return;

  const target =
    problem.code === "SUBSCRIPTION_EXPIRED"
      ? safePlansPath(problem.plans_path) ?? "/acesso-suspenso"
      : "/acesso-suspenso";

  window.location.replace(target);
}

export function getStoredSubscriptionAccessProblem() {
  if (typeof window === "undefined") return null;
  try {
    return parseSubscriptionAccessProblem(
      JSON.parse(window.sessionStorage.getItem(ACCESS_STORAGE_KEY) ?? "null")
    );
  } catch {
    return null;
  }
}

export const subscriptionAwareFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (response.status !== 401 && response.status !== 403) return response;

  try {
    const payload = await response.clone().json();
    const problem = parseSubscriptionAccessProblem(payload);
    if (problem) redirectForSubscriptionAccess(problem);
  } catch {
    // Preserve the original Supabase response when it is not JSON.
  }

  return response;
};
