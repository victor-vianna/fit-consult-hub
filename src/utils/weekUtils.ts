import { startOfWeek, format, addWeeks, subWeeks } from "date-fns";

/**
 * Retorna o início da semana (segunda-feira) no formato yyyy-MM-dd
 */
export const getWeekStart = (date: Date = new Date()): string => {
  const weekStart = startOfWeek(date, { weekStartsOn: 1 });
  return format(weekStart, "yyyy-MM-dd");
};

/**
 * Retorna a data de início da semana anterior
 */
export const getPreviousWeekStart = (currentWeek: string): string => {
  const date = new Date(currentWeek + "T12:00:00");
  return getWeekStart(subWeeks(date, 1));
};

/**
 * Retorna a data de início da próxima semana
 */
export const getNextWeekStart = (currentWeek: string): string => {
  const date = new Date(currentWeek + "T12:00:00");
  return getWeekStart(addWeeks(date, 1));
};

/**
 * Verifica se uma semana é a semana atual
 */
export const isCurrentWeek = (weekStart: string): boolean => {
  return weekStart === getWeekStart();
};
