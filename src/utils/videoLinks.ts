export const DEFAULT_VIDEO_THUMBNAIL = "/exercise-thumbnail.svg";

export interface DemonstrationVideoLink {
  label: string;
  url: string;
}

export type DemonstrationVideoInput =
  | string
  | {
      label?: unknown;
      url?: unknown;
    };

function getSafeHttpUrl(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;

  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url;
  } catch {
    return null;
  }
}

export function getYoutubeId(value?: string | null) {
  const url = getSafeHttpUrl(value);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./, "");

  if (host === "youtu.be") {
    return url.pathname.split("/").filter(Boolean)[0] || null;
  }

  if (host.endsWith("youtube.com")) {
    if (url.pathname === "/watch") return url.searchParams.get("v");

    const [, type, id] = url.pathname.split("/");
    if (["embed", "shorts"].includes(type) && id) return id;
  }

  return null;
}

export function getNormalizedVideoUrl(value?: string | null) {
  const url = getSafeHttpUrl(value);
  if (!url) return null;

  const youtubeId = getYoutubeId(url.href);
  if (youtubeId) return `https://www.youtube.com/watch?v=${youtubeId}`;

  return url.href;
}

function getSafeImageSource(value?: string | null) {
  const raw = value?.trim();
  if (!raw) return null;
  if (raw.startsWith("/")) return raw;

  return getSafeHttpUrl(raw)?.href ?? null;
}

export function getVideoThumbnail(
  videoUrl?: string | null,
  fallbackImage?: string | null
) {
  const normalizedUrl = getNormalizedVideoUrl(videoUrl);
  if (!normalizedUrl) return null;

  const fallback = getSafeImageSource(fallbackImage);
  if (fallback) return fallback;

  const youtubeId = getYoutubeId(normalizedUrl);
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;

  return DEFAULT_VIDEO_THUMBNAIL;
}

export function getValidVideoReferences(
  links?: unknown,
  legacyVideoUrl?: string | null
): DemonstrationVideoLink[] {
  const candidates: DemonstrationVideoInput[] = Array.isArray(links)
    ? [...(links as DemonstrationVideoInput[])]
    : [];

  if (legacyVideoUrl) {
    candidates.push({ label: "Vídeo 1", url: legacyVideoUrl });
  }

  const seen = new Set<string>();
  const normalized: DemonstrationVideoLink[] = [];

  for (const candidate of candidates) {
    const rawUrl =
      typeof candidate === "string"
        ? candidate
        : typeof candidate?.url === "string"
          ? candidate.url
          : "";
    const url = getNormalizedVideoUrl(rawUrl);

    if (!url || seen.has(url)) continue;

    const rawLabel =
      typeof candidate === "object" &&
      candidate !== null &&
      typeof candidate.label === "string"
        ? candidate.label.trim()
        : "";

    seen.add(url);
    normalized.push({
      label: rawLabel || `Vídeo ${normalized.length + 1}`,
      url,
    });
  }

  return normalized;
}

export function getFirstValidVideoUrl(links?: Array<string | null | undefined> | null) {
  return getValidVideoReferences(links)[0]?.url ?? null;
}
