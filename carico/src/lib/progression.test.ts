import { describe, expect, it } from "vitest";
import {
  bestSet,
  buildProgression,
  estimate1RM,
  formatDuration,
  formatSeconds,
  personalRecords,
  progressDelta,
  suggestNextLoad,
  volume,
} from "./progression";

describe("estimate1RM", () => {
  it("con una ripetizione coincide con il carico", () => expect(estimate1RM(100, 1)).toBe(100));
  it("usa la formula di Epley", () => expect(estimate1RM(100, 10)).toBeCloseTo(133.33, 1));
  it("restituisce 0 per input non validi", () => {
    expect(estimate1RM(0, 5)).toBe(0);
    expect(estimate1RM(50, 0)).toBe(0);
  });
});

describe("volume e bestSet", () => {
  const sets = [
    { weight: 80, reps: 8 },
    { weight: 85, reps: 6 },
    { weight: 70, reps: 12 },
  ];
  it("somma peso × ripetizioni", () => expect(volume(sets)).toBe(80 * 8 + 85 * 6 + 70 * 12));
  it("trova la serie con il miglior 1RM stimato", () => expect(bestSet(sets)).toEqual({ weight: 85, reps: 6 }));
  it("gestisce liste vuote", () => expect(bestSet([])).toBeNull());
});

describe("buildProgression", () => {
  const history = [
    { date: new Date("2026-03-08"), sets: [{ weight: 62.5, reps: 8 }, { weight: 62.5, reps: 8 }] },
    { date: new Date("2026-03-01"), sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 7 }] },
    { date: new Date("2026-03-15"), sets: [] },
  ];
  const points = buildProgression(history);

  it("ordina per data ed esclude le sessioni vuote", () => {
    expect(points.map((p) => p.date.toISOString().slice(0, 10))).toEqual(["2026-03-01", "2026-03-08"]);
  });
  it("calcola massimo, 1RM, volume e ripetizioni", () => {
    expect(points[0]).toMatchObject({ maxWeight: 60, e1rm: 76, volume: 900, totalReps: 15 });
  });
  it("calcola la variazione percentuale", () => {
    expect(progressDelta(points, "maxWeight")).toBeCloseTo(4.2, 1);
    expect(progressDelta(points.slice(0, 1), "e1rm")).toBeNull();
  });
  it("trova i record personali", () => {
    expect(personalRecords(points)).toEqual({ maxWeight: 62.5, e1rm: 79.2 });
    expect(personalRecords([])).toBeNull();
  });
});

describe("suggestNextLoad (doppia progressione)", () => {
  const target = { sets: 3, repsMin: 8, repsMax: 10 };
  it("aumenta se tutte le serie arrivano al massimo del range", () => {
    expect(suggestNextLoad([{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 11 }], target)).toEqual({
      weight: 52.5,
      reason: "aumenta",
    });
  });
  it("mantiene se si è dentro il range", () => {
    expect(suggestNextLoad([{ weight: 50, reps: 10 }, { weight: 50, reps: 9 }, { weight: 50, reps: 8 }], target)?.reason).toBe(
      "mantieni",
    );
  });
  it("non aumenta se mancano serie", () => {
    expect(suggestNextLoad([{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }], target)?.reason).toBe("mantieni");
  });
  it("riduce se la maggior parte delle serie è sotto il minimo", () => {
    expect(suggestNextLoad([{ weight: 50, reps: 6 }, { weight: 50, reps: 5 }, { weight: 50, reps: 8 }], target)).toEqual({
      weight: 46.5,
      reason: "riduci",
    });
  });
  it("restituisce null senza dati di carico", () => {
    expect(suggestNextLoad([{ weight: 0, reps: 12 }], target)).toBeNull();
  });
});

describe("formattazione", () => {
  it("formatta durate e secondi", () => {
    expect(formatDuration(65 * 60000)).toBe("1 h 05 min");
    expect(formatDuration(42 * 60000)).toBe("42 min");
    expect(formatSeconds(95)).toBe("1:35");
  });
});
