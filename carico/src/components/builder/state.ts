import type { PlanDraft, PlanItemDraft } from "@/lib/plan-schema";
import { formatWeight, parseWeightInput, type WeightUnit } from "@/lib/units";

/** Stato del costruttore: come PlanDraft, ma con id locali per il drag and drop e il carico come testo. */
export interface BuilderItem extends Omit<PlanItemDraft, "load"> {
  uid: string;
  loadText: string;
}
export interface BuilderDay {
  uid: string;
  name: string;
  items: BuilderItem[];
}
export interface BuilderState {
  name: string;
  goal: PlanDraft["goal"];
  level: PlanDraft["level"];
  daysPerWeek: number;
  notes: string;
  days: BuilderDay[];
}

let counter = 0;
export function uid(prefix = "id"): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}-${counter}`;
}

export function toBuilderState(draft: PlanDraft, unit: WeightUnit): BuilderState {
  return {
    name: draft.name,
    goal: draft.goal,
    level: draft.level,
    daysPerWeek: draft.daysPerWeek,
    notes: draft.notes ?? "",
    days: draft.days.map((d) => ({
      uid: uid("day"),
      name: d.name,
      items: d.items.map((i) => ({
        ...i,
        uid: uid("item"),
        loadText: i.load ? formatWeight(i.load, unit, false) : "",
      })),
    })),
  };
}

export function fromBuilderState(state: BuilderState, unit: WeightUnit): PlanDraft {
  return {
    name: state.name,
    goal: state.goal,
    level: state.level,
    daysPerWeek: state.daysPerWeek,
    notes: state.notes,
    days: state.days.map((d) => ({
      name: d.name,
      items: d.items.map(({ uid: _uid, loadText, ...rest }) => ({
        ...rest,
        load: parseWeightInput(loadText, unit),
      })),
    })),
  };
}

export function newItem(exerciseSlug: string, type: string): BuilderItem {
  const isCardio = type === "cardio" || type === "mobilita";
  return {
    uid: uid("item"),
    exerciseSlug,
    sets: isCardio ? 1 : 3,
    repsMin: isCardio ? 1 : 8,
    repsMax: isCardio ? 1 : 12,
    loadText: "",
    restSeconds: isCardio ? 0 : 90,
    tempo: null,
    notes: type === "cardio" ? "15–20 minuti" : null,
    superset: null,
  };
}

export const REST_PRESETS = [0, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300];

export function formatRest(seconds: number): string {
  if (seconds === 0) return "Nessuno";
  if (seconds < 60) return `${seconds}″`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}′${s.toString().padStart(2, "0")}″` : `${m}′`;
}

export function formatReps(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`;
}
