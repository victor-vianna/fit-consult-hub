interface WorkoutBlockingLoaderDecision {
  hasLoadedOnce: boolean;
  isInitialLoading: boolean;
}

interface WorkoutLoadErrorDecision {
  hasData: boolean;
  hasError: boolean;
}

export function shouldShowWorkoutBlockingLoader({
  hasLoadedOnce,
  isInitialLoading,
}: WorkoutBlockingLoaderDecision): boolean {
  return !hasLoadedOnce && isInitialLoading;
}

export function shouldShowWorkoutLoadError({
  hasData,
  hasError,
}: WorkoutLoadErrorDecision): boolean {
  return !hasData && hasError;
}
