/** Parsing difensivo delle colonne JSON salvate come testo in SQLite. */
export function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

export function parseStringArray(value: string | null | undefined): string[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
}
