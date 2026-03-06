// src/constants/workoutStatus.ts
// Centralized workout status constants to prevent string literal inconsistencies

/**
 * Statuses for treino_sessoes (workout timer sessions)
 */
export const SESSION_STATUS = {
  EM_ANDAMENTO: "em_andamento",
  PAUSADO: "pausado",
  CONCLUIDO: "concluido",
  CANCELADO: "cancelado",
} as const;

export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS];

export const ACTIVE_SESSION_STATUSES: SessionStatus[] = [
  SESSION_STATUS.EM_ANDAMENTO,
  SESSION_STATUS.PAUSADO,
];

/**
 * Statuses for planilhas_treino (training plan sheets)
 */
export const PLANILHA_STATUS = {
  ATIVA: "ativa",
  ENCERRADA: "encerrada",
  RENOVADA: "renovada",
} as const;

export type PlanilhaStatus = (typeof PLANILHA_STATUS)[keyof typeof PLANILHA_STATUS];

/**
 * Derived statuses for the student UI (computed from planilha data, not stored)
 */
export const PLANILHA_UI_STATUS = {
  SEM_PLANILHA: "sem_planilha",
  BLOQUEADA: "bloqueada",
  EXPIRADA: "expirada",
  CRITICA: "critica",
  EXPIRANDO: "expirando",
  ATIVA: "ativa",
} as const;

export type PlanilhaUIStatus = (typeof PLANILHA_UI_STATUS)[keyof typeof PLANILHA_UI_STATUS];

/**
 * Custom events dispatched across the app for cross-component sync
 */
export const WORKOUT_EVENTS = {
  /** Fired when a workout is completed via timer finalization */
  COMPLETED: "workout-completed",
  /** Fired when exercise progress changes (toggle concluido) */
  PROGRESS_CHANGED: "workout-progress-changed",
  /** Fired when dashboard should refresh its data */
  DASHBOARD_REFRESH: "dashboard-refresh",
} as const;

/**
 * Helper to dispatch a typed workout event
 */
export function dispatchWorkoutEvent(
  eventName: string,
  detail?: Record<string, any>
) {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}
