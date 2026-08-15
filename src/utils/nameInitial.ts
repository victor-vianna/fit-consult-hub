export function getNameInitials(name?: string | null, fallback = "U") {
  const cleanName = name?.replace(/\([^)]*\)/g, " ").trim() || "";
  const parts = cleanName.match(/\p{L}+/gu) || [];

  if (parts.length === 0) return fallback.toLocaleUpperCase("pt-BR");

  const firstInitial = parts[0][0];
  const lastInitial = parts.length > 1 ? parts[parts.length - 1][0] : "";

  return `${firstInitial}${lastInitial}`.toLocaleUpperCase("pt-BR");
}
