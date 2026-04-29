// Kitchen unit conversions. Hebrew-friendly + common US/metric.
// All conversions go through a "base" unit (ml for volume, g for mass).

type Dimension = "volume" | "mass" | "temperature" | "count";

type UnitDef = {
  key: string;
  labelHe: string;
  dim: Dimension;
  /** Factor → base unit. For temperature this is unused; we handle F↔C specially. */
  toBase: number;
};

export const UNITS: UnitDef[] = [
  // Volume (ml)
  { key: "ml",    labelHe: "מ\"ל",    dim: "volume", toBase: 1 },
  { key: "l",     labelHe: "ליטר",   dim: "volume", toBase: 1000 },
  { key: "tsp",   labelHe: "כפית",   dim: "volume", toBase: 5 },
  { key: "tbsp",  labelHe: "כף",     dim: "volume", toBase: 15 },
  { key: "cup",   labelHe: "כוס",    dim: "volume", toBase: 240 },
  { key: "floz",  labelHe: "אונקיה נוזל", dim: "volume", toBase: 29.5735 },
  // Mass (g)
  { key: "g",     labelHe: "גרם",    dim: "mass",   toBase: 1 },
  { key: "kg",    labelHe: "ק\"ג",   dim: "mass",   toBase: 1000 },
  { key: "oz",    labelHe: "אונקיה", dim: "mass",   toBase: 28.3495 },
  { key: "lb",    labelHe: "ליברה",  dim: "mass",   toBase: 453.592 },
  // Count — for ingredients like "3 ביצים"
  { key: "yehida", labelHe: "יחידה", dim: "count",  toBase: 1 },
  // Temperature (handled specially)
  { key: "c",     labelHe: "°C",     dim: "temperature", toBase: 1 },
  { key: "f",     labelHe: "°F",     dim: "temperature", toBase: 1 },
];

export const UNITS_BY_DIM: Record<Dimension, UnitDef[]> = {
  volume: UNITS.filter((u) => u.dim === "volume"),
  mass: UNITS.filter((u) => u.dim === "mass"),
  temperature: UNITS.filter((u) => u.dim === "temperature"),
  count: UNITS.filter((u) => u.dim === "count"),
};

export function convert(value: number, fromKey: string, toKey: string): number | null {
  const from = UNITS.find((u) => u.key === fromKey);
  const to = UNITS.find((u) => u.key === toKey);
  if (!from || !to || from.dim !== to.dim) return null;
  if (from.dim === "temperature") {
    // °C ↔ °F special-case
    if (fromKey === toKey) return value;
    if (fromKey === "c") return value * 9 / 5 + 32;
    return (value - 32) * 5 / 9;
  }
  const base = value * from.toBase;
  return base / to.toBase;
}

/**
 * Map a loose Hebrew unit string (from a recipe ingredient) to our canonical key.
 * Handles the common Israeli-kitchen shorthands we scatter through SAMPLE_RECIPES.
 */
export function normalizeUnit(raw: string): string {
  const s = raw.trim();
  const map: Record<string, string> = {
    "": "yehida",
    "יח": "yehida",
    "יחידה": "yehida",
    "יחידות": "yehida",
    "כף": "tbsp",
    "כפ": "tbsp",
    "כפות": "tbsp",
    "כפית": "tsp",
    "כפי": "tsp",
    "כפיות": "tsp",
    "כוס": "cup",
    "כוסות": "cup",
    "גרם": "g",
    "ק\"ג": "kg",
    "קג": "kg",
    "מ\"ל": "ml",
    "מל": "ml",
    "ליטר": "l",
    "שן": "yehida",
    "שיני": "yehida",
  };
  return map[s] ?? s.toLowerCase();
}

/** Format an amount for display: whole numbers plain, fractions rounded to 2 decimals max. */
export function fmtAmount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) < 0.01) return "0";
  if (n === Math.round(n)) return String(Math.round(n));
  return n.toFixed(n < 1 ? 2 : 1);
}
