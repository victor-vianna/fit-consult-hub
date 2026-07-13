type DateInput = string | number | Date | null | undefined;

function getAppLanguage() {
  if (typeof document !== "undefined") {
    const documentLanguage = document.documentElement.lang;
    if (documentLanguage) return documentLanguage;
  }

  if (typeof navigator === "undefined") return "pt-BR";
  return navigator.languages?.[0] || navigator.language || "pt-BR";
}

export function getDisplayDateLocale() {
  return getAppLanguage() || "pt-BR";
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

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function parseDateInputValue(value: string | null | undefined) {
  if (!value) return null;

  const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateOnly) return toDate(value);

  const [, year, month, day] = dateOnly;
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function dateInputToIsoString(value: string | null | undefined) {
  const date = parseDateInputValue(value);
  return date ? date.toISOString() : null;
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

export function formatDisplayDateOnly(value: DateInput, options?: { shortYear?: boolean }) {
  const inputDate = formatDateForInput(value);
  return inputDate ? formatDisplayDate(inputDate, options) : "";
}

export function formatDisplayDateLong(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getDisplayDateLocale(), {
    day: "2-digit",
    month: "long",
    year: "numeric",
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

export function formatDisplayTime(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getDisplayDateLocale(), {
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

export function formatDisplayMonthYear(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";

  return new Intl.DateTimeFormat(getDisplayDateLocale(), {
    month: "short",
    year: "numeric",
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

export function formatDateForInput(value: DateInput) {
  if (typeof value === "string") {
    const datePart = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (datePart) {
      const [, year, month, day] = datePart;
      return `${year}-${month}-${day}`;
    }
  }

  const date = toDate(value);
  if (!date) return "";

  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join("-");
}

export function formatDateTimeForInput(value: DateInput) {
  const date = toDate(value);
  if (!date) return "";

  return `${formatDateForInput(date)}T${padDatePart(date.getHours())}:${padDatePart(date.getMinutes())}`;
}
