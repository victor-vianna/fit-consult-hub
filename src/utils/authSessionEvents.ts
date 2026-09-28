export interface AuthEventDecisionInput {
  event: string;
  currentUserId: string | null;
  nextUserId: string | null;
  initialized: boolean;
  hasRole: boolean;
}

export interface AuthEventDecision {
  reinitialize: boolean;
  showLoading: boolean;
  clear: boolean;
}

const NO_AUTH_CHANGE: AuthEventDecision = {
  reinitialize: false,
  showLoading: false,
  clear: false,
};

export function decideAuthEvent({
  event,
  currentUserId,
  nextUserId,
  initialized,
  hasRole,
}: AuthEventDecisionInput): AuthEventDecision {
  if (event === "SIGNED_OUT") {
    return { reinitialize: false, showLoading: false, clear: true };
  }

  if (!nextUserId) return NO_AUTH_CHANGE;

  if (currentUserId !== nextUserId) {
    return { reinitialize: true, showLoading: true, clear: false };
  }

  if (!initialized || !hasRole) {
    return {
      reinitialize: true,
      showLoading: !hasRole,
      clear: false,
    };
  }

  return NO_AUTH_CHANGE;
}
