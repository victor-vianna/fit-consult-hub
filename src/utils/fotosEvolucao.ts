import { supabase } from "@/integrations/supabase/client";

const BUCKET = "fotos-evolucao";
const SIGN_TTL = 3600; // 1h

/** Extracts the storage object path from either a public URL, signed URL, or raw path. */
export function extractFotoPath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  // If already a path (no http), return as-is
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const marker = `/${BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return urlOrPath;
  let path = urlOrPath.substring(idx + marker.length);
  // strip query (?token=...) if present
  const q = path.indexOf("?");
  if (q !== -1) path = path.substring(0, q);
  return path;
}

/** Returns a short-lived signed URL for a foto (private bucket). */
export async function getFotoSignedUrl(
  urlOrPath: string
): Promise<string> {
  const path = extractFotoPath(urlOrPath);
  if (!path) return "";
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL);
  if (error || !data?.signedUrl) {
    console.error("Erro ao assinar URL de foto:", error);
    return "";
  }
  return data.signedUrl;
}

/** Bulk-resolve signed URLs keyed by the original stored URL/path. */
export async function getFotosSignedMap(
  urls: string[]
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(urls.filter(Boolean)));
  const entries = await Promise.all(
    unique.map(async (u) => [u, await getFotoSignedUrl(u)] as const)
  );
  return Object.fromEntries(entries);
}
