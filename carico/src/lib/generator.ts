/**
 * Generatore automatico di schede.
 *
 * Dato obiettivo, livello, giorni a settimana e attrezzatura disponibile
 * sceglie uno split adatto, riempie ogni giorno con "slot" muscolari e assegna
 * a ogni esercizio serie/ripetizioni/recupero coerenti con l'obiettivo.
 * È una funzione pura e deterministica (a parità di `seed`), quindi testabile.
 */
import type { Equipment, ExerciseType, Goal, Level, MuscleGroup } from "./domain";
import type { PlanDraft, PlanItemDraft } from "./plan-schema";

export interface GeneratorExercise {
  slug: string;
  primaryMuscle: MuscleGroup;
  equipment: Equipment;
  level: Level;
  type: ExerciseType;
}

export interface GeneratorInput {
  goal: Goal;
  level: Level;
  daysPerWeek: number;
  equipment: Equipment[];
  /** Cambiando il seed si ottiene una variante diversa della scheda. */
  seed?: number;
}

type SlotKind = "multi" | "iso" | "any" | "cardio";
interface Slot {
  muscle: MuscleGroup;
  kind: SlotKind;
}
interface DayTemplate {
  name: string;
  slots: Slot[];
}

const m = (muscle: MuscleGroup, kind: SlotKind = "multi"): Slot => ({ muscle, kind });

const FULL_BODY: DayTemplate[] = [
  { name: "Full body A", slots: [m("quadricipiti"), m("petto"), m("schiena"), m("spalle"), m("femorali", "any"), m("core", "any")] },
  { name: "Full body B", slots: [m("lombari"), m("schiena"), m("petto"), m("glutei", "any"), m("bicipiti", "iso"), m("addominali", "iso")] },
  { name: "Full body C", slots: [m("quadricipiti"), m("spalle"), m("schiena"), m("petto", "any"), m("tricipiti", "iso"), m("polpacci", "iso")] },
];
const PUSH: DayTemplate = {
  name: "Push",
  slots: [m("petto"), m("petto", "any"), m("spalle"), m("spalle", "iso"), m("tricipiti", "iso"), m("tricipiti", "any")],
};
const PULL: DayTemplate = {
  name: "Pull",
  slots: [m("schiena"), m("schiena"), m("schiena", "any"), m("spalle", "iso"), m("bicipiti", "iso"), m("avambracci", "iso")],
};
const LEGS: DayTemplate = {
  name: "Gambe",
  slots: [m("quadricipiti"), m("femorali"), m("quadricipiti", "any"), m("glutei", "any"), m("polpacci", "iso"), m("addominali", "iso")],
};
const UPPER: DayTemplate = {
  name: "Parte alta",
  slots: [m("petto"), m("schiena"), m("spalle"), m("schiena", "any"), m("bicipiti", "iso"), m("tricipiti", "iso")],
};
const LOWER: DayTemplate = {
  name: "Parte bassa",
  slots: [m("quadricipiti"), m("lombari"), m("glutei", "any"), m("femorali", "iso"), m("polpacci", "iso"), m("core", "any")],
};

/** Sceglie lo split in base a giorni e livello. */
export function chooseSplit(daysPerWeek: number, level: Level): DayTemplate[] {
  const d = Math.min(6, Math.max(1, Math.round(daysPerWeek)));
  switch (d) {
    case 1:
      return [FULL_BODY[0]!];
    case 2:
      return [FULL_BODY[0]!, FULL_BODY[1]!];
    case 3:
      return level === "principiante" ? FULL_BODY : [PUSH, PULL, LEGS];
    case 4:
      return [
        { ...UPPER, name: "Parte alta A" },
        { ...LOWER, name: "Parte bassa A" },
        { ...UPPER, name: "Parte alta B" },
        { ...LOWER, name: "Parte bassa B" },
      ];
    case 5:
      return [PUSH, PULL, LEGS, UPPER, LOWER];
    default:
      return [
        { ...PUSH, name: "Push A" },
        { ...PULL, name: "Pull A" },
        { ...LEGS, name: "Gambe A" },
        { ...PUSH, name: "Push B" },
        { ...PULL, name: "Pull B" },
        { ...LEGS, name: "Gambe B" },
      ];
  }
}

export interface Prescription {
  sets: number;
  repsMin: number;
  repsMax: number;
  restSeconds: number;
  tempo: string | null;
}

/** Serie, ripetizioni e recuperi in funzione di obiettivo, tipo di esercizio e livello. */
export function prescriptionFor(goal: Goal, kind: "multi" | "iso", level: Level): Prescription {
  const table: Record<Goal, Record<"multi" | "iso", Prescription>> = {
    forza: {
      multi: { sets: 5, repsMin: 3, repsMax: 5, restSeconds: 180, tempo: "2-1-X-0" },
      iso: { sets: 3, repsMin: 6, repsMax: 8, restSeconds: 90, tempo: null },
    },
    ipertrofia: {
      multi: { sets: 4, repsMin: 6, repsMax: 10, restSeconds: 120, tempo: "3-0-1-0" },
      iso: { sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60, tempo: "2-0-1-1" },
    },
    dimagrimento: {
      multi: { sets: 3, repsMin: 10, repsMax: 15, restSeconds: 60, tempo: null },
      iso: { sets: 3, repsMin: 12, repsMax: 15, restSeconds: 45, tempo: null },
    },
    resistenza: {
      multi: { sets: 3, repsMin: 15, repsMax: 20, restSeconds: 45, tempo: null },
      iso: { sets: 2, repsMin: 15, repsMax: 20, restSeconds: 30, tempo: null },
    },
  };
  const base = table[goal][kind];
  const delta = level === "principiante" ? -1 : level === "avanzato" && kind === "multi" ? 1 : 0;
  return { ...base, sets: Math.max(2, base.sets + delta) };
}

const LEVEL_RANK: Record<Level, number> = { principiante: 0, intermedio: 1, avanzato: 2 };

/** PRNG deterministico (mulberry32). */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function matchesKind(e: GeneratorExercise, kind: SlotKind): boolean {
  if (kind === "cardio") return e.type === "cardio";
  if (e.type === "mobilita" || e.type === "cardio") return false;
  if (kind === "multi") return e.type === "multiarticolare";
  if (kind === "iso") return e.type === "isolamento";
  return true;
}

/** Restituisce l'esercizio migliore per lo slot, o null se nessuno è compatibile. */
function pickExercise(
  pool: GeneratorExercise[],
  slot: Slot,
  level: Level,
  usedInDay: Set<string>,
  usedInPlan: Map<string, number>,
  random: () => number,
): GeneratorExercise | null {
  const allowed = pool.filter((e) => LEVEL_RANK[e.level] <= LEVEL_RANK[level] && !usedInDay.has(e.slug));
  const byMuscle = allowed.filter((e) => e.primaryMuscle === slot.muscle);
  let candidates = byMuscle.filter((e) => matchesKind(e, slot.kind));
  // Se non c'è un esercizio del tipo richiesto, accetta qualsiasi esercizio di forza per quel muscolo.
  if (candidates.length === 0) candidates = byMuscle.filter((e) => matchesKind(e, "any"));
  if (candidates.length === 0) return null;

  let best: GeneratorExercise | null = null;
  let bestScore = -Infinity;
  for (const e of candidates) {
    let score = random() * 2; // varietà
    score -= (usedInPlan.get(e.slug) ?? 0) * 5; // evita ripetizioni tra i giorni
    score += 2 - Math.abs(LEVEL_RANK[level] - LEVEL_RANK[e.level]); // livello vicino a quello dell'utente
    if (slot.kind === "multi" && (e.equipment === "bilanciere" || e.equipment === "manubri")) score += 1;
    if (e.equipment === "corpo-libero") score -= 0.5; // preferisci attrezzi caricabili se disponibili
    if (score > bestScore) {
      best = e;
      bestScore = score;
    }
  }
  return best;
}

export function generatePlan(input: GeneratorInput, exercises: GeneratorExercise[]): PlanDraft {
  const random = rng(input.seed ?? 1);
  const available = new Set<Equipment>([...input.equipment, "corpo-libero"]);
  const pool = exercises.filter((e) => available.has(e.equipment));
  const split = chooseSplit(input.daysPerWeek, input.level);
  const usedInPlan = new Map<string, number>();

  const days = split.map((template, dayIndex) => {
    const usedInDay = new Set<string>();
    const items: PlanItemDraft[] = [];
    for (const slot of template.slots) {
      const ex = pickExercise(pool, slot, input.level, usedInDay, usedInPlan, random);
      if (!ex) continue;
      usedInDay.add(ex.slug);
      usedInPlan.set(ex.slug, (usedInPlan.get(ex.slug) ?? 0) + 1);
      const p = prescriptionFor(input.goal, ex.type === "multiarticolare" ? "multi" : "iso", input.level);
      items.push({ exerciseSlug: ex.slug, ...p, load: null, notes: null, superset: null });
    }

    // Dimagrimento e resistenza: esercizi di isolamento in superset per aumentare la densità.
    if (input.goal === "dimagrimento" || input.goal === "resistenza") {
      let letter = 0;
      for (let i = 0; i + 1 < items.length; i++) {
        const a = items[i]!;
        const b = items[i + 1]!;
        const isoA = pool.find((e) => e.slug === a.exerciseSlug)?.type === "isolamento";
        const isoB = pool.find((e) => e.slug === b.exerciseSlug)?.type === "isolamento";
        if (isoA && isoB && !a.superset) {
          const l = String.fromCharCode(65 + letter++);
          a.superset = l;
          b.superset = l;
          i++;
        }
      }
    }

    // Dimagrimento: finale cardio a intensità moderata.
    if (input.goal === "dimagrimento") {
      const cardio = pickExercise(pool, { muscle: "cardio", kind: "cardio" }, input.level, usedInDay, usedInPlan, random);
      if (cardio) {
        usedInPlan.set(cardio.slug, (usedInPlan.get(cardio.slug) ?? 0) + 1);
        items.push({
          exerciseSlug: cardio.slug,
          sets: 1,
          repsMin: 1,
          repsMax: 1,
          load: null,
          restSeconds: 0,
          tempo: null,
          notes: "15–20 minuti a intensità moderata",
          superset: null,
        });
      }
    }

    const letter = String.fromCharCode(65 + dayIndex);
    return { name: split.length > 1 ? `${letter} · ${template.name}` : template.name, items };
  });

  const goalName: Record<Goal, string> = {
    ipertrofia: "Ipertrofia",
    forza: "Forza",
    dimagrimento: "Dimagrimento",
    resistenza: "Resistenza",
  };

  return {
    name: `${goalName[input.goal]} · ${split.length} ${split.length === 1 ? "giorno" : "giorni"}`,
    goal: input.goal,
    level: input.level,
    daysPerWeek: split.length,
    notes: "Scheda generata automaticamente: personalizzala liberamente.",
    days,
  };
}
