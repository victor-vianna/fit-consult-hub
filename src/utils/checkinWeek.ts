import { format } from "date-fns";

function getIsoWeekInfo(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));

  return {
    year: d.getUTCFullYear(),
    weekNumber: Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7),
  };
}

export function getCheckinWeekInfo(date: Date = new Date()) {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);

  const start = new Date(normalizedDate);
  start.setDate(normalizedDate.getDate() - normalizedDate.getDay());
  start.setHours(12, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);

  const weekReference = new Date(start);
  weekReference.setDate(start.getDate() + 1);

  const { year, weekNumber } = getIsoWeekInfo(weekReference);

  return {
    year,
    weekNumber,
    start,
    end,
    startIso: format(start, "yyyy-MM-dd"),
    endIso: format(end, "yyyy-MM-dd"),
  };
}
