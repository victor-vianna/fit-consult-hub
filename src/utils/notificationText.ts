const EMOJI_REGEX =
  /[\p{Extended_Pictographic}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

export function stripNotificationEmoji(value: string) {
  return value.replace(EMOJI_REGEX, "").replace(/\s+/g, " ").trim();
}

export function limitNotificationText(value: string, maxLength: number) {
  const clean = stripNotificationEmoji(value);
  if (clean.length <= maxLength) return clean;

  const sliced = clean.slice(0, maxLength).trimEnd();
  const lastSpace = sliced.lastIndexOf(" ");
  return (lastSpace > Math.floor(maxLength * 0.6)
    ? sliced.slice(0, lastSpace)
    : sliced
  ).trim();
}

export function firstName(name?: string | null) {
  const clean = stripNotificationEmoji(name || "");
  return clean.split(/\s+/).filter(Boolean)[0] || "Aluno";
}

export function compactName(name?: string | null, maxLength = 30) {
  const clean = stripNotificationEmoji(name || "");
  if (!clean) return "Aluno";
  if (clean.length <= maxLength) return clean;

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return limitNotificationText(clean, maxLength);

  const firstAndLast = `${parts[0]} ${parts[parts.length - 1]}`;
  if (firstAndLast.length <= maxLength) return firstAndLast;

  return parts[0].length <= maxLength ? parts[0] : limitNotificationText(parts[0], maxLength);
}

export function formatWorkoutDuration(totalSeconds: number) {
  const minutes = Math.max(0, Math.round(totalSeconds / 60));
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0) {
    return `${hours}h${String(remainingMinutes).padStart(2, "0")}min`;
  }

  return `${remainingMinutes}min`;
}

export function previewNotificationMessage(message: string, maxLength = 60) {
  return limitNotificationText(message.replace(/\s+/g, " "), maxLength);
}
