type DateInput = string | number | Date | null | undefined;

function getBrowserLanguage() {
  if (typeof navigator === "undefined") return "pt-BR";
  return navigator.language || navigator.languages?.[0] || "pt-BR";
}

export function getDisplayDateLocale() {
  const language = getBrowserLanguage().toLowerCase();
  return language.startsWith("pt") ? "pt-BR" : "en-US";
}

function toDate(value: DateInput) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  if (typeof value === "string") {
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const [, year, month, day] = dateOnly;
      return new Date(Number(year), Number(month) - 1, Number(day));
    }
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDisplayDate(value: DateInput, options?: { shortYear?: boolean }) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getDisplayDateLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: options?.shortYear ? "2-digit" : "numeric",
  }).format(date);
}

export function formatDisplayDateTime(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getDisplayDateLocale(), {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDisplayMonthDay(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getDisplayDateLocale(), {
    day: "2-digit",
    month: "2-digit",
  }).format(date);
}

export function formatDisplayDateRange(start: DateInput, end: DateInput) {
  const startText = formatDisplayMonthDay(start);
  const endText = formatDisplayMonthDay(end);
  if (!startText && !endText) return "";
  if (!startText) return endText;
  if (!endText) return startText;
  return `${startText} - ${endText}`;
}
