import { describe, expect, it } from "vitest";
import { exerciseSeeds } from "../../prisma/data";
import type { Equipment, Level } from "./domain";
import { chooseSplit, generatePlan, prescriptionFor, type GeneratorExercise } from "./generator";
import { planDraftSchema } from "./plan-schema";

const pool: GeneratorExercise[] = exerciseSeeds.map((e) => ({
  slug: e.slug,
  primaryMuscle: e.primary,
  equipment: e.equipment,
  level: e.level,
  type: e.type,
}));
const bySlug = new Map(pool.map((e) => [e.slug, e]));
const FULL_GYM: Equipment[] = ["bilanciere", "manubri", "macchinario", "cavi", "kettlebell", "elastici", "altro"];
const RANK: Record<Level, number> = { principiante: 0, intermedio: 1, avanzato: 2 };

describe("chooseSplit", () => {
  it("usa full body per i principianti a 3 giorni e PPL per gli altri", () => {
    expect(chooseSplit(3, "principiante").map((d) => d.name)).toEqual(["Full body A", "Full body B", "Full body C"]);
    expect(chooseSplit(3, "intermedio").map((d) => d.name)).toEqual(["Push", "Pull", "Gambe"]);
  });
  it("limita i giorni tra 1 e 6", () => {
    expect(chooseSplit(0, "intermedio")).toHaveLength(1);
    expect(chooseSplit(9, "intermedio")).toHaveLength(6);
  });
});

describe("prescriptionFor", () => {
  it("forza: poche ripetizioni e recuperi lunghi", () => {
    const p = prescriptionFor("forza", "multi", "intermedio");
    expect(p.repsMax).toBeLessThanOrEqual(6);
    expect(p.restSeconds).toBeGreaterThanOrEqual(150);
  });
  it("resistenza: molte ripetizioni e recuperi brevi", () => {
    const p = prescriptionFor("resistenza", "iso", "intermedio");
    expect(p.repsMin).toBeGreaterThanOrEqual(15);
    expect(p.restSeconds).toBeLessThanOrEqual(45);
  });
  it("adatta il numero di serie al livello", () => {
    expect(prescriptionFor("ipertrofia", "multi", "principiante").sets).toBe(3);
    expect(prescriptionFor("ipertrofia", "multi", "avanzato").sets).toBe(5);
  });
});

describe("generatePlan", () => {
  for (const days of [1, 2, 3, 4, 5, 6]) {
    it(`crea ${days} giorni validi`, () => {
      const plan = generatePlan({ goal: "ipertrofia", level: "intermedio", daysPerWeek: days, equipment: FULL_GYM }, pool);
      expect(plan.days).toHaveLength(days);
      expect(planDraftSchema.safeParse(plan).success).toBe(true);
      for (const d of plan.days) expect(d.items.length).toBeGreaterThanOrEqual(5);
    });
  }

  it("non ripete lo stesso esercizio nello stesso giorno", () => {
    const plan = generatePlan({ goal: "forza", level: "avanzato", daysPerWeek: 6, equipment: FULL_GYM }, pool);
    for (const d of plan.days) {
      const slugs = d.items.map((i) => i.exerciseSlug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("usa solo l'attrezzatura disponibile (più il corpo libero)", () => {
    const plan = generatePlan({ goal: "ipertrofia", level: "intermedio", daysPerWeek: 3, equipment: ["manubri"] }, pool);
    for (const d of plan.days)
      for (const i of d.items) expect(["manubri", "corpo-libero"]).toContain(bySlug.get(i.exerciseSlug)!.equipment);
  });

  it("rispetta il livello dell'utente", () => {
    const plan = generatePlan({ goal: "ipertrofia", level: "principiante", daysPerWeek: 3, equipment: FULL_GYM }, pool);
    for (const d of plan.days)
      for (const i of d.items) expect(RANK[bySlug.get(i.exerciseSlug)!.level]).toBe(0);
  });

  it("è bilanciata: allena tutti i grandi gruppi nella settimana", () => {
    const plan = generatePlan({ goal: "ipertrofia", level: "intermedio", daysPerWeek: 4, equipment: FULL_GYM }, pool);
    const muscles = new Set(plan.days.flatMap((d) => d.items.map((i) => bySlug.get(i.exerciseSlug)!.primaryMuscle)));
    for (const g of ["petto", "schiena", "spalle", "quadricipiti", "femorali", "glutei"]) expect(muscles).toContain(g);
  });

  it("varia gli esercizi tra giorni con lo stesso schema", () => {
    const plan = generatePlan({ goal: "ipertrofia", level: "intermedio", daysPerWeek: 6, equipment: FULL_GYM }, pool);
    const pushA = plan.days[0]!.items.map((i) => i.exerciseSlug);
    const pushB = plan.days[3]!.items.map((i) => i.exerciseSlug);
    expect(pushA).not.toEqual(pushB);
  });

  it("è deterministica a parità di seed e cambia con un seed diverso", () => {
    const input = { goal: "ipertrofia" as const, level: "intermedio" as const, daysPerWeek: 3, equipment: FULL_GYM };
    expect(generatePlan({ ...input, seed: 7 }, pool)).toEqual(generatePlan({ ...input, seed: 7 }, pool));
    const a = generatePlan({ ...input, seed: 1 }, pool).days.flatMap((d) => d.items.map((i) => i.exerciseSlug));
    const b = generatePlan({ ...input, seed: 2 }, pool).days.flatMap((d) => d.items.map((i) => i.exerciseSlug));
    expect(a).not.toEqual(b);
  });

  it("dimagrimento: aggiunge superset e un finale cardio", () => {
    const plan = generatePlan({ goal: "dimagrimento", level: "intermedio", daysPerWeek: 3, equipment: FULL_GYM }, pool);
    for (const d of plan.days) {
      expect(bySlug.get(d.items.at(-1)!.exerciseSlug)!.primaryMuscle).toBe("cardio");
      expect(d.items.some((i) => i.superset)).toBe(true);
    }
  });

  it("funziona anche solo a corpo libero", () => {
    const plan = generatePlan({ goal: "resistenza", level: "principiante", daysPerWeek: 2, equipment: [] }, pool);
    expect(plan.days.every((d) => d.items.length >= 3)).toBe(true);
  });
});
