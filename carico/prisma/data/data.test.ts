import { describe, expect, it } from "vitest";
import { exerciseSeeds } from ".";
import { ALL_MUSCLES, EQUIPMENT, EXERCISE_TYPES, LEVELS, MUSCLE_GROUPS } from "../../src/lib/domain";

describe("database esercizi (seed)", () => {
  it("contiene almeno 150 esercizi", () => {
    expect(exerciseSeeds.length).toBeGreaterThanOrEqual(150);
  });

  it("ha slug univoci", () => {
    const slugs = exerciseSeeds.map((e) => e.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("copre tutti i gruppi muscolari e gli attrezzi principali", () => {
    for (const g of MUSCLE_GROUPS) expect(exerciseSeeds.some((e) => e.primary === g), g).toBe(true);
    for (const eq of ["bilanciere", "manubri", "macchinario", "cavi", "corpo-libero", "kettlebell", "elastici"]) {
      expect(exerciseSeeds.some((e) => e.equipment === eq), eq).toBe(true);
    }
  });

  it("ha valori validi e contenuti completi", () => {
    for (const e of exerciseSeeds) {
      expect(EQUIPMENT, e.slug).toContain(e.equipment);
      expect(LEVELS, e.slug).toContain(e.level);
      expect(EXERCISE_TYPES, e.slug).toContain(e.type);
      for (const m of e.secondary) expect(ALL_MUSCLES, e.slug).toContain(m);
      expect(e.start.length + e.exec.length + e.end.length, e.slug).toBeGreaterThanOrEqual(3);
      expect(e.mistakes.length, e.slug).toBeGreaterThanOrEqual(3);
      expect(e.safety.length, e.slug).toBeGreaterThanOrEqual(1);
      expect(e.easier.length + e.harder.length, e.slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("le varianti che sembrano slug puntano a esercizi esistenti", () => {
    const slugs = new Set(exerciseSeeds.map((e) => e.slug));
    for (const e of exerciseSeeds) {
      for (const v of [...e.easier, ...e.harder]) {
        if (/^[a-z0-9-]+$/.test(v)) expect(slugs.has(v), `${e.slug} → ${v}`).toBe(true);
      }
    }
  });
});
