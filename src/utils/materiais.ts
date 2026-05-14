import { supabase } from "@/integrations/supabase/client";

const BUCKET = "materiais";
const SIGN_TTL = 3600; // 1h

/** Extracts the storage object path from a public URL, signed URL, or raw path. */
export function extractMaterialPath(urlOrPath: string): string {
  if (!urlOrPath) return "";
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const marker = `/${BUCKET}/`;
  const idx = urlOrPath.indexOf(marker);
  if (idx === -1) return urlOrPath;
  let path = urlOrPath.substring(idx + marker.length);
  const q = path.indexOf("?");
  if (q !== -1) path = path.substring(0, q);
  return path;
}

/** Returns a short-lived signed URL for a material file (private bucket). */
export async function getMaterialSignedUrl(urlOrPath: string): Promise<string> {
  const path = extractMaterialPath(urlOrPath);
  if (!path) return "";
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGN_TTL);
  if (error || !data?.signedUrl) {
    console.error("Erro ao assinar URL de material:", error);
    return "";
  }
  return data.signedUrl;
}
