export type WeightUnit = "kg" | "lb";

export const KG_PER_LB = 0.45359237;

export function kgToUnit(kg: number, unit: WeightUnit): number {
  return unit === "kg" ? kg : kg / KG_PER_LB;
}

export function unitToKg(value: number, unit: WeightUnit): number {
  return unit === "kg" ? value : value * KG_PER_LB;
}

/** Arrotonda al passo più comune dei dischi: 0,5 kg o 1 lb. */
export function roundForUnit(value: number, unit: WeightUnit): number {
  const step = unit === "kg" ? 0.5 : 1;
  return Math.round(value / step) * step;
}

export function formatWeight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  if (kg === null || kg === undefined || Number.isNaN(kg)) return "–";
  const v = roundForUnit(kgToUnit(kg, unit), unit);
  const s = Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ",");
  return withUnit ? `${s} ${unit}` : s;
}

/** Interpreta un input dell'utente ("62,5", "62.5") nella sua unità e lo converte in kg. */
export function parseWeightInput(raw: string, unit: WeightUnit): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n < 0 || n > 2000) return null;
  return unitToKg(n, unit);
}
