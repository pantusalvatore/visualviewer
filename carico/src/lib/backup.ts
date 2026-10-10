import "server-only";
import { z } from "zod";
import { upsertCustomExercises } from "./custom-exercises";
import { toExerciseDetail } from "./exercise";
import { customExerciseSchema, planDraftSchema } from "./plan-schema";
import { prisma } from "./prisma";
import { getPlan, planToDraft } from "./queries";

/**
 * Backup completo dei dati dell'utente in un unico file JSON:
 * schede, storico allenamenti, esercizi personalizzati (con foto),
 * preferiti e note. Il database degli esercizi di base non è incluso
 * perché viene ricreato dal seed.
 */
export const backupSchema = z.object({
  app: z.literal("carico"),
  kind: z.literal("backup"),
  version: z.literal(1),
  exportedAt: z.string(),
  settings: z.object({ theme: z.string().optional(), unit: z.string().optional() }).default({}),
  customExercises: z.array(customExerciseSchema.extend({ images: z.array(z.string()).default([]), favorite: z.boolean().default(false) })).default([]),
  exerciseMeta: z.array(z.object({ slug: z.string(), favorite: z.boolean(), notes: z.string().nullable() })).default([]),
  media: z.array(z.object({ id: z.string(), mime: z.string(), data: z.string() })).default([]),
  plans: z.array(z.object({ id: z.string(), plan: planDraftSchema })).default([]),
  sessions: z
    .array(
      z.object({
        planId: z.string().nullable(),
        dayName: z.string(),
        planName: z.string(),
        startedAt: z.string(),
        finishedAt: z.string().nullable(),
        notes: z.string().nullable(),
        sets: z.array(
          z.object({
            exerciseSlug: z.string(),
            position: z.number().int(),
            setNumber: z.number().int(),
            weight: z.number(),
            reps: z.number().int(),
          }),
        ),
      }),
    )
    .default([]),
});
export type Backup = z.output<typeof backupSchema>;

export async function buildBackup(): Promise<Backup> {
  const [custom, meta, media, plans, sessions] = await Promise.all([
    prisma.exercise.findMany({ where: { isCustom: true } }),
    prisma.exercise.findMany({
      where: { isCustom: false, OR: [{ favorite: true }, { notes: { not: null } }] },
      select: { slug: true, favorite: true, notes: true },
    }),
    prisma.media.findMany(),
    prisma.plan.findMany({ select: { id: true }, orderBy: { createdAt: "asc" } }),
    prisma.workoutSession.findMany({
      orderBy: { startedAt: "asc" },
      include: { sets: { include: { exercise: { select: { slug: true } } } } },
    }),
  ]);

  const fullPlans = [];
  for (const { id } of plans) {
    const p = await getPlan(id);
    if (p) fullPlans.push({ id, plan: planToDraft(p) });
  }

  return {
    app: "carico",
    kind: "backup",
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: {},
    customExercises: custom.map((row) => {
      const e = toExerciseDetail(row);
      return {
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
        images: e.images,
        favorite: e.favorite,
      };
    }),
    exerciseMeta: meta,
    media: media.map((m) => ({ id: m.id, mime: m.mime, data: Buffer.from(m.data).toString("base64") })),
    plans: fullPlans as Backup["plans"],
    sessions: sessions.map((s) => ({
      planId: s.planId,
      planName: s.planName,
      dayName: s.dayName,
      startedAt: s.startedAt.toISOString(),
      finishedAt: s.finishedAt?.toISOString() ?? null,
      notes: s.notes,
      sets: s.sets.map((x) => ({
        exerciseSlug: x.exercise.slug,
        position: x.position,
        setNumber: x.setNumber,
        weight: x.weight,
        reps: x.reps,
      })),
    })),
  };
}

/** Sostituisce tutti i dati dell'utente con quelli del backup. */
export async function restoreBackup(data: Backup): Promise<{ plans: number; sessions: number; exercises: number }> {
  await prisma.$transaction([
    prisma.workoutSession.deleteMany(),
    prisma.plan.deleteMany(),
    prisma.exercise.deleteMany({ where: { isCustom: true } }),
    prisma.media.deleteMany(),
    prisma.exercise.updateMany({ data: { favorite: false, notes: null } }),
  ]);

  for (const m of data.media) {
    await prisma.media.create({ data: { id: m.id, mime: m.mime, data: Buffer.from(m.data, "base64") } });
  }
  await upsertCustomExercises(data.customExercises);
  for (const e of data.customExercises) {
    await prisma.exercise.update({ where: { slug: e.slug }, data: { images: JSON.stringify(e.images) } });
  }
  for (const e of data.customExercises) if (e.favorite) await prisma.exercise.update({ where: { slug: e.slug }, data: { favorite: true } });
  for (const m of data.exerciseMeta) {
    await prisma.exercise.updateMany({ where: { slug: m.slug }, data: { favorite: m.favorite, notes: m.notes } });
  }

  const allSlugs = await prisma.exercise.findMany({ select: { id: true, slug: true } });
  const idBySlug = new Map(allSlugs.map((e) => [e.slug, e.id]));

  const planIdMap = new Map<string, string>();
  for (const { id, plan } of data.plans) {
    const created = await prisma.plan.create({
      data: {
        name: plan.name,
        goal: plan.goal,
        level: plan.level,
        daysPerWeek: plan.daysPerWeek,
        notes: plan.notes,
        days: {
          create: plan.days.map((d, di) => ({
            name: d.name,
            order: di,
            items: {
              create: d.items
                .filter((i) => idBySlug.has(i.exerciseSlug))
                .map((i, ii) => ({
                  exerciseId: idBySlug.get(i.exerciseSlug)!,
                  order: ii,
                  sets: i.sets,
                  repsMin: i.repsMin,
                  repsMax: i.repsMax,
                  load: i.load,
                  restSeconds: i.restSeconds,
                  tempo: i.tempo,
                  notes: i.notes,
                  superset: i.superset,
                })),
            },
          })),
        },
      },
      include: { days: { select: { id: true, name: true } } },
    });
    planIdMap.set(id, created.id);
    for (const d of created.days) planIdMap.set(`${id}::${d.name}`, d.id);
  }

  let sessions = 0;
  for (const s of data.sessions) {
    const planId = s.planId ? (planIdMap.get(s.planId) ?? null) : null;
    const dayId = s.planId ? (planIdMap.get(`${s.planId}::${s.dayName}`) ?? null) : null;
    await prisma.workoutSession.create({
      data: {
        planId,
        dayId,
        planName: s.planName,
        dayName: s.dayName,
        startedAt: new Date(s.startedAt),
        finishedAt: s.finishedAt ? new Date(s.finishedAt) : null,
        notes: s.notes,
        sets: {
          create: s.sets
            .filter((x) => idBySlug.has(x.exerciseSlug))
            .map((x) => ({
              exerciseId: idBySlug.get(x.exerciseSlug)!,
              position: x.position,
              setNumber: x.setNumber,
              weight: x.weight,
              reps: x.reps,
              completed: true,
            })),
        },
      },
    });
    sessions++;
  }
  return { plans: data.plans.length, sessions, exercises: data.customExercises.length };
}
