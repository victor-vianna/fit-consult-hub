export const ANAMNESE_RENEWAL_DAYS = 180;
export const CHECKIN_AVAILABLE_AFTER_DAYS = 7;

export interface AnamneseTimestampFields {
  preenchida_em?: string | null;
  updated_at?: string | null;
  created_at?: string | null;
}

export function getAnamneseReferenceDateValue(
  anamnese?: AnamneseTimestampFields | null
): string | null {
  if (!anamnese) return null;

  const values = [
    anamnese.preenchida_em,
    anamnese.updated_at,
    anamnese.created_at,
  ];
  let latestDate: Date | null = null;

  values.forEach((value) => {
    const date = parseAnamneseDate(value);
    if (date && (!latestDate || date.getTime() > latestDate.getTime())) {
      latestDate = date;
    }
  });

  return latestDate?.toISOString() ?? null;
}

export function parseAnamneseDate(value?: string | null): Date | null {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getAnamneseReferenceDate(
  anamnese?: AnamneseTimestampFields | null
): Date | null {
  return parseAnamneseDate(getAnamneseReferenceDateValue(anamnese));
}

export function getDaysSinceAnamnese(
  anamnese?: AnamneseTimestampFields | null,
  baseDate = new Date()
): number | null {
  const referenceDate = getAnamneseReferenceDate(anamnese);
  if (!referenceDate) return null;

  return Math.floor(
    (baseDate.getTime() - referenceDate.getTime()) / (1000 * 60 * 60 * 24)
  );
}
