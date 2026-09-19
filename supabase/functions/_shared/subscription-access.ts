type SupabaseAdminClient = {
  from: (table: string) => any;
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{
    data: unknown;
    error: { message?: string } | null;
  }>;
};

export type SubscriptionAccessDecision = {
  allowed?: boolean;
  source?: string | null;
  reason_code?: string | null;
  reason?: string | null;
  plans_path?: string | null;
  expires_at?: string | null;
};

export type SubscriptionAccessFailure = {
  status: 403 | 500;
  body: {
    error: string;
    code: "SUBSCRIPTION_EXPIRED" | "ACCESS_SUSPENDED" | "ACCESS_CHECK_FAILED";
    reason_code?: string | null;
    reason?: string | null;
    plans_path?: string | null;
    expires_at?: string | null;
  };
};

/**
 * Edge Functions use service_role and therefore bypass RLS. Any protected
 * function callable by a student must call this helper after validating JWT.
 */
export async function getStudentAccessFailure(
  admin: SupabaseAdminClient,
  actorId: string,
): Promise<SubscriptionAccessFailure | null> {
  const { data: roleRow, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", actorId)
    .maybeSingle();

  if (roleError) {
    return {
      status: 500,
      body: {
        error: "Nao foi possivel verificar o acesso.",
        code: "ACCESS_CHECK_FAILED",
      },
    };
  }

  if (roleRow?.role !== "aluno") return null;

  const { data, error } = await admin.rpc("calculate_student_access_decision", {
    _student_id: actorId,
    _at: new Date().toISOString(),
  });

  if (error || !data || typeof data !== "object") {
    return {
      status: 500,
      body: {
        error: "Nao foi possivel verificar o acesso.",
        code: "ACCESS_CHECK_FAILED",
      },
    };
  }

  const decision = data as SubscriptionAccessDecision;
  if (decision.allowed === true) return null;

  const code = decision.source === "payment" || decision.source === "settings"
    ? "SUBSCRIPTION_EXPIRED"
    : "ACCESS_SUSPENDED";

  return {
    status: 403,
    body: {
      error: decision.reason || "Acesso indisponivel.",
      code,
      reason_code: decision.reason_code,
      reason: decision.reason,
      plans_path: decision.plans_path,
      expires_at: decision.expires_at,
    },
  };
}
