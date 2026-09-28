export interface PriorityAccessStateLike {
  allowed: boolean;
  status: string;
  source: string;
}

export function isStudentManuallyBlockedFromPriorities(
  state?: PriorityAccessStateLike | null
) {
  if (!state || state.allowed || state.source !== "manual") return false;

  return state.status === "pausado" || state.status === "suspenso";
}
