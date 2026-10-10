import "server-only";
import type { Prisma } from "@prisma/client";
import { toExerciseDetail, toExerciseSummary, type ExerciseSummary } from "./exercise";
import { GOALS, LEVELS, isOneOf, type Goal, type Level } from "./domain";
import type { CustomExerciseExport, PlanDraft, PlanExport } from "./plan-schema";
import { prisma } from "./prisma";

export async function getExerciseSummaries(): Promise<ExerciseSummary[]> {
  const rows = await prisma.exercise.findMany({ orderBy: { name: "asc" } });
  return rows.map(toExerciseSummary);
}

export async function getExerciseBySlug(slug: string) {
  const row = await prisma.exercise.findUnique({ where: { slug } });
  return row ? toExerciseDetail(row) : null;
}

export async function getExerciseNamesBySlugs(slugs: string[]): Promise<Map<string, string>> {
  if (slugs.length === 0) return new Map();
  const rows = await prisma.exercise.findMany({ where: { slug: { in: slugs } }, select: { slug: true, name: true } });
  return new Map(rows.map((r) => [r.slug, r.name]));
}

const planInclude = {
  days: {
    orderBy: { order: "asc" },
    include: { items: { orderBy: { order: "asc" }, include: { exercise: true } } },
  },
} satisfies Prisma.PlanInclude;

export type PlanWithDays = Prisma.PlanGetPayload<{ include: typeof planInclude }>;

export async function getPlan(id: string): Promise<PlanWithDays | null> {
  return prisma.plan.findUnique({ where: { id }, include: planInclude });
}

export async function getPlans() {
  const plans = await prisma.plan.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      days: { orderBy: { order: "asc" }, select: { id: true, name: true, _count: { select: { items: true } } } },
      sessions: { orderBy: { startedAt: "desc" }, take: 1, select: { startedAt: true, dayId: true } },
    },
  });
  return plans.map((p) => ({
    id: p.id,
    name: p.name,
    goal: (isOneOf(GOALS, p.goal) ? p.goal : "ipertrofia") as Goal,
    level: (isOneOf(LEVELS, p.level) ? p.level : "intermedio") as Level,
    daysPerWeek: p.daysPerWeek,
    updatedAt: p.updatedAt,
    days: p.days.map((d) => ({ id: d.id, name: d.name, exerciseCount: d._count.items })),
    lastSession: p.sessions[0] ?? null,
  }));
}

export function planToDraft(plan: PlanWithDays): PlanDraft {
  return {
    name: plan.name,
    goal: (isOneOf(GOALS, plan.goal) ? plan.goal : "ipertrofia") as Goal,
    level: (isOneOf(LEVELS, plan.level) ? plan.level : "intermedio") as Level,
    daysPerWeek: plan.daysPerWeek,
    notes: plan.notes,
    days: plan.days.map((d) => ({
      name: d.name,
      items: d.items.map((i) => ({
        exerciseSlug: i.exercise.slug,
        sets: i.sets,
        repsMin: i.repsMin,
        repsMax: i.repsMax,
        load: i.load,
        restSeconds: i.restSeconds,
        tempo: i.tempo,
        notes: i.notes,
        superset: i.superset,
      })),
    })),
  };
}

/** Prepara il file di esportazione, includendo gli esercizi personalizzati usati. */
export function planToExport(plan: PlanWithDays): PlanExport {
  const custom = new Map<string, CustomExerciseExport>();
  for (const d of plan.days)
    for (const i of d.items)
      if (i.exercise.isCustom && !custom.has(i.exercise.slug)) {
        const e = toExerciseDetail(i.exercise);
        custom.set(e.slug, {
          slug: e.slug,
          name: e.name,
          nameEn: e.nameEn,
          primaryMuscle: e.primaryMuscle,
          secondaryMuscles: e.secondaryMuscles,
          equipment: e.equipment,
          level: e.level,
          type: e.type,
          instructions: e.instructions,
          mistakes: e.mistakes,
          safety: e.safety,
          easier: e.easier,
          harder: e.harder,
          notes: e.notes,
        });
      }
  return {
    app: "carico",
    kind: "scheda",
    version: 1,
    plan: planToDraft(plan) as PlanExport["plan"],
    customExercises: [...custom.values()],
  };
}

export interface LastPerformance {
  date: Date;
  sets: { setNumber: number; weight: number; reps: number }[];
}

/** Ultima sessione registrata per ciascun esercizio (riferimento in modalità allenamento). */
export async function getLastPerformances(exerciseIds: string[]): Promise<Record<string, LastPerformance>> {
  const out: Record<string, LastPerformance> = {};
  for (const exerciseId of new Set(exerciseIds)) {
    const last = await prisma.workoutSet.findFirst({
      where: { exerciseId, completed: true },
      orderBy: { session: { startedAt: "desc" } },
      select: { sessionId: true, session: { select: { startedAt: true } } },
    });
    if (!last) continue;
    const sets = await prisma.workoutSet.findMany({
      where: { exerciseId, sessionId: last.sessionId, completed: true },
      orderBy: { setNumber: "asc" },
      select: { setNumber: true, weight: true, reps: true },
    });
    out[exerciseId] = { date: last.session.startedAt, sets };
  }
  return out;
}

export async function getSessions(limit?: number) {
  const sessions = await prisma.workoutSession.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    include: { sets: { select: { weight: true, reps: true, exerciseId: true } } },
  });
  return sessions.map((s) => ({
    id: s.id,
    planId: s.planId,
    planName: s.planName,
    dayName: s.dayName,
    startedAt: s.startedAt,
    finishedAt: s.finishedAt,
    setCount: s.sets.length,
    exerciseCount: new Set(s.sets.map((x) => x.exerciseId)).size,
    volume: s.sets.reduce((sum, x) => sum + x.weight * x.reps, 0),
  }));
}

export async function getSession(id: string) {
  return prisma.workoutSession.findUnique({
    where: { id },
    include: {
      sets: { orderBy: [{ position: "asc" }, { setNumber: "asc" }], include: { exercise: true } },
    },
  });
}

/** Esercizi con almeno una serie registrata, con il numero di sessioni. */
export async function getTrackedExercises() {
  const grouped = await prisma.workoutSet.groupBy({
    by: ["exerciseId"],
    where: { completed: true },
    _count: { _all: true },
    _max: { weight: true },
  });
  if (grouped.length === 0) return [];
  const rows = await prisma.exercise.findMany({ where: { id: { in: grouped.map((g) => g.exerciseId) } } });
  const byId = new Map(rows.map((r) => [r.id, toExerciseSummary(r)]));
  return grouped
    .map((g) => ({ exercise: byId.get(g.exerciseId)!, setCount: g._count._all, maxWeight: g._max.weight ?? 0 }))
    .filter((g) => g.exercise)
    .sort((a, b) => b.setCount - a.setCount);
}

export async function getExerciseHistory(exerciseId: string) {
  const sets = await prisma.workoutSet.findMany({
    where: { exerciseId, completed: true },
    orderBy: [{ session: { startedAt: "asc" } }, { setNumber: "asc" }],
    include: { session: { select: { id: true, startedAt: true, planName: true, dayName: true } } },
  });
  const bySession = new Map<string, { id: string; date: Date; label: string; sets: { weight: number; reps: number }[] }>();
  for (const s of sets) {
    const entry = bySession.get(s.sessionId) ?? {
      id: s.session.id,
      date: s.session.startedAt,
      label: `${s.session.planName} · ${s.session.dayName}`,
      sets: [],
    };
    entry.sets.push({ weight: s.weight, reps: s.reps });
    bySession.set(s.sessionId, entry);
  }
  return [...bySession.values()];
}
