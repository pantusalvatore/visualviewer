import { describe, expect, it } from "vitest";
import { exerciseSeeds } from "../../prisma/data";
import { filterExercises, type ExerciseSummary } from "./exercise";
import { planDraftSchema, planExportSchema } from "./plan-schema";
import { decodeShare, encodeShare } from "./share";
import { PLAN_TEMPLATES } from "./templates";
import { formatWeight, parseWeightInput, unitToKg } from "./units";

const summaries: ExerciseSummary[] = exerciseSeeds.map((e, i) => ({
  id: String(i),
  slug: e.slug,
  name: e.name,
  nameEn: e.nameEn ?? null,
  primaryMuscle: e.primary,
  secondaryMuscles: e.secondary,
  equipment: e.equipment,
  level: e.level,
  type: e.type,
  isCustom: false,
  favorite: i % 10 === 0,
  image: null,
}));

describe("template", () => {
  const slugs = new Set(exerciseSeeds.map((e) => e.slug));
  for (const t of PLAN_TEMPLATES) {
    it(`${t.title} è valido e usa esercizi esistenti`, () => {
      expect(planDraftSchema.safeParse(t.plan).success).toBe(true);
      expect(t.plan.days).toHaveLength(t.plan.daysPerWeek);
      for (const d of t.plan.days) for (const i of d.items) expect(slugs.has(i.exerciseSlug), i.exerciseSlug).toBe(true);
    });
  }
});

describe("filterExercises", () => {
  it("cerca senza distinguere accenti e maiuscole, anche per nome inglese", () => {
    expect(filterExercises(summaries, { q: "PANCA piana" }).map((e) => e.slug)).toContain("panca-piana-bilanciere");
    expect(filterExercises(summaries, { q: "mobilita" }).length).toBe(0);
    expect(filterExercises(summaries, { q: "deadlift" }).some((e) => e.slug === "stacco-da-terra")).toBe(true);
  });
  it("combina i filtri", () => {
    const r = filterExercises(summaries, { muscle: "petto", equipment: "manubri", level: "principiante" });
    expect(r.length).toBeGreaterThan(0);
    expect(r.every((e) => e.primaryMuscle === "petto" && e.equipment === "manubri" && e.level === "principiante")).toBe(true);
  });
  it("filtra i preferiti", () => {
    expect(filterExercises(summaries, { favorites: true }).every((e) => e.favorite)).toBe(true);
  });
});

describe("validazione scheda", () => {
  const base = PLAN_TEMPLATES[0]!.plan;
  it("rifiuta un range di ripetizioni invertito", () => {
    const bad = structuredClone(base);
    bad.days[0]!.items[0]!.repsMin = 12;
    bad.days[0]!.items[0]!.repsMax = 8;
    const r = planDraftSchema.safeParse(bad);
    expect(r.success).toBe(false);
  });
  it("rifiuta un nome vuoto e un tempo malformato", () => {
    const bad = structuredClone(base);
    bad.name = " ";
    bad.days[0]!.items[0]!.tempo = "lento";
    const r = planDraftSchema.safeParse(bad);
    expect(r.success).toBe(false);
    expect(r.error!.issues.map((i) => i.path.join("."))).toEqual(expect.arrayContaining(["name", "days.0.items.0.tempo"]));
  });
  it("normalizza superset e tempo in maiuscolo", () => {
    const ok = structuredClone(base);
    ok.days[0]!.items[0]!.superset = "b";
    ok.days[0]!.items[0]!.tempo = "3-1-x-0";
    const r = planDraftSchema.parse(ok);
    expect(r.days[0]!.items[0]!.superset).toBe("B");
    expect(r.days[0]!.items[0]!.tempo).toBe("3-1-X-0");
  });
});

describe("link di condivisione", () => {
  it("codifica e decodifica una scheda senza perdite", async () => {
    const data = planExportSchema.parse({ app: "carico", kind: "scheda", version: 1, plan: PLAN_TEMPLATES[1]!.plan });
    const code = await encodeShare(data);
    expect(code.startsWith("c1.")).toBe(true);
    expect(code).toMatch(/^[A-Za-z0-9._-]+$/);
    expect(await decodeShare(code)).toEqual(data);
  });
  it("segnala link non validi", async () => {
    await expect(decodeShare("abc")).rejects.toThrow();
    await expect(decodeShare("c1.@@@")).rejects.toThrow();
  });
});

describe("unità di misura", () => {
  it("converte e formatta kg e lb", () => {
    expect(formatWeight(100, "kg")).toBe("100 kg");
    expect(formatWeight(62.5, "kg")).toBe("62,5 kg");
    expect(formatWeight(100, "lb")).toBe("220 lb");
    expect(formatWeight(null, "kg")).toBe("–");
    expect(unitToKg(220.462, "lb")).toBeCloseTo(100, 2);
  });
  it("interpreta l'input con virgola o punto", () => {
    expect(parseWeightInput("62,5", "kg")).toBe(62.5);
    expect(parseWeightInput("", "kg")).toBeNull();
    expect(parseWeightInput("abc", "kg")).toBeNull();
    expect(parseWeightInput("-3", "kg")).toBeNull();
  });
});
