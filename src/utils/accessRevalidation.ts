interface BlockingLoaderDecision {
  firstCheckDone: boolean;
  authLoading: boolean;
  checkingAccess: boolean;
}

interface BackgroundCheckDecision {
  now: number;
  lastCheckAt: number;
  inFlight: boolean;
  minIntervalMs: number;
}

export function shouldShowBlockingLoader({
  firstCheckDone,
  authLoading,
  checkingAccess,
}: BlockingLoaderDecision): boolean {
  return !firstCheckDone && (authLoading || checkingAccess);
}

export function shouldStartBackgroundCheck({
  now,
  lastCheckAt,
  inFlight,
  minIntervalMs,
}: BackgroundCheckDecision): boolean {
  if (inFlight) return false;
  if (lastCheckAt === 0) return true;

  return now - lastCheckAt >= minIntervalMs;
}

/**
 * A network failure during a background revalidation must preserve the screen
 * already authorized by the last completed access check.
 */
export function backgroundErrorKeepsScreen(): boolean {
  return true;
}
