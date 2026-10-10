/**
 * Calcoli di progressione: massimale stimato, volume, migliori serie,
 * serie temporali per i grafici e suggerimento del carico successivo.
 * Tutte le funzioni sono pure e lavorano in kg.
 */

export interface LoggedSet {
  weight: number; // kg
  reps: number;
}

export interface SessionSets {
  date: Date;
  sets: LoggedSet[];
}

export interface ProgressPoint {
  date: Date;
  /** Carico massimo sollevato nella sessione. */
  maxWeight: number;
  /** Miglior massimale stimato (1RM) della sessione. */
  e1rm: number;
  /** Volume totale: somma di peso × ripetizioni. */
  volume: number;
  /** Ripetizioni totali (utile per esercizi a corpo libero). */
  totalReps: number;
}

/** Massimale stimato con la formula di Epley (affidabile fino a ~12 ripetizioni). */
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export function volume(sets: LoggedSet[]): number {
  return sets.reduce((sum, s) => sum + Math.max(0, s.weight) * Math.max(0, s.reps), 0);
}

/** Serie migliore per massimale stimato (a parità, quella con più ripetizioni). */
export function bestSet(sets: LoggedSet[]): LoggedSet | null {
  let best: LoggedSet | null = null;
  let bestScore = -1;
  for (const s of sets) {
    const score = estimate1RM(s.weight, s.reps);
    if (score > bestScore || (score === bestScore && best && s.reps > best.reps)) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

/** Converte lo storico di un esercizio in punti ordinati per data (sessioni senza serie escluse). */
export function buildProgression(history: SessionSets[]): ProgressPoint[] {
  return history
    .filter((h) => h.sets.length > 0)
    .map((h) => ({
      date: h.date,
      maxWeight: Math.max(...h.sets.map((s) => s.weight)),
      e1rm: round1(Math.max(...h.sets.map((s) => estimate1RM(s.weight, s.reps)))),
      volume: round1(volume(h.sets)),
      totalReps: h.sets.reduce((sum, s) => sum + s.reps, 0),
    }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Variazione percentuale tra il primo e l'ultimo punto della metrica indicata. */
export function progressDelta(points: ProgressPoint[], metric: "e1rm" | "maxWeight" | "volume" | "totalReps"): number | null {
  if (points.length < 2) return null;
  const first = points[0]![metric];
  const last = points[points.length - 1]![metric];
  if (first === 0) return null;
  return round1(((last - first) / first) * 100);
}

/** Record personali: miglior carico e miglior 1RM stimato di sempre. */
export function personalRecords(points: ProgressPoint[]): { maxWeight: number; e1rm: number } | null {
  if (points.length === 0) return null;
  return {
    maxWeight: Math.max(...points.map((p) => p.maxWeight)),
    e1rm: Math.max(...points.map((p) => p.e1rm)),
  };
}

export interface LoadSuggestion {
  weight: number;
  reason: "aumenta" | "mantieni" | "riduci";
}

/**
 * Doppia progressione: se nell'ultima sessione tutte le serie previste hanno
 * raggiunto il massimo del range di ripetizioni, aumenta il carico; se più della
 * metà delle serie è rimasta sotto il minimo, riducilo del 5–10%; altrimenti mantienilo.
 */
export function suggestNextLoad(
  last: LoggedSet[],
  target: { sets: number; repsMin: number; repsMax: number },
  increment = 2.5,
): LoadSuggestion | null {
  const working = last.filter((s) => s.weight > 0);
  if (working.length === 0) return null;
  const top = Math.max(...working.map((s) => s.weight));
  const atTop = working.filter((s) => s.weight === top);
  const allHitMax = working.length >= target.sets && atTop.every((s) => s.reps >= target.repsMax);
  if (allHitMax) return { weight: top + increment, reason: "aumenta" };
  const belowMin = working.filter((s) => s.reps < target.repsMin).length;
  if (belowMin > working.length / 2) {
    return { weight: Math.max(0, roundTo(top * 0.925, 0.5)), reason: "riduci" };
  }
  return { weight: top, reason: "mantieni" };
}

export function formatDuration(ms: number): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h} h ${m.toString().padStart(2, "0")} min` : `${m} min`;
}

export function formatSeconds(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function roundTo(n: number, step: number): number {
  return Math.round(n / step) * step;
}
