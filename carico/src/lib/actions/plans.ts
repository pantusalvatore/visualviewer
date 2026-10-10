"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "../prisma";
import { planDraftSchema, planExportSchema, zodErrorMap, type PlanDraft, type PlanDraftParsed } from "../plan-schema";
import { getPlan, planToDraft } from "../queries";
import { upsertCustomExercises } from "../custom-exercises";

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

/** Scrive giorni ed esercizi di una scheda risolvendo gli slug in id. */
async function writePlan(planId: string | null, plan: PlanDraftParsed): Promise<string> {
  const slugs = [...new Set(plan.days.flatMap((d) => d.items.map((i) => i.exerciseSlug)))];
  const exercises = await prisma.exercise.findMany({ where: { slug: { in: slugs } }, select: { id: true, slug: true } });
  const idBySlug = new Map(exercises.map((e) => [e.slug, e.id]));
  const missing = slugs.filter((s) => !idBySlug.has(s));
  if (missing.length > 0) throw new Error(`Esercizi non trovati: ${missing.join(", ")}`);

  const fields = {
    name: plan.name,
    goal: plan.goal,
    level: plan.level,
    daysPerWeek: plan.daysPerWeek,
    notes: plan.notes,
  };
  const days = {
    create: plan.days.map((d, dayIndex) => ({
      name: d.name,
      order: dayIndex,
      items: {
        create: d.items.map((i, itemIndex) => ({
          exerciseId: idBySlug.get(i.exerciseSlug)!,
          order: itemIndex,
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
  };

  if (planId) {
    // Le sessioni di allenamento fanno riferimento al giorno per id: proviamo a
    // mantenere il collegamento ricollegandole per nome dopo la riscrittura.
    const oldDays = await prisma.planDay.findMany({ where: { planId }, select: { id: true, name: true } });
    await prisma.$transaction([
      prisma.planDay.deleteMany({ where: { planId } }),
      prisma.plan.update({ where: { id: planId }, data: { ...fields, days } }),
    ]);
    const newDays = await prisma.planDay.findMany({ where: { planId }, select: { id: true, name: true } });
    for (const old of oldDays) {
      const match = newDays.find((d) => d.name === old.name);
      if (match) await prisma.workoutSession.updateMany({ where: { dayId: old.id }, data: { dayId: match.id } });
    }
    return planId;
  }
  const created = await prisma.plan.create({ data: { ...fields, days } });
  return created.id;
}

export async function savePlan(planId: string | null, draft: PlanDraft): Promise<ActionResult<{ id: string }>> {
  const parsed = planDraftSchema.safeParse(draft);
  if (!parsed.success) {
    return { ok: false, error: "Controlla i campi evidenziati.", fieldErrors: zodErrorMap(parsed.error) };
  }
  try {
    const id = await writePlan(planId, parsed.data);
    revalidatePath("/schede");
    revalidatePath(`/schede/${id}`);
    revalidatePath("/");
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Salvataggio non riuscito." };
  }
}

export async function duplicatePlan(planId: string): Promise<ActionResult<{ id: string }>> {
  const plan = await getPlan(planId);
  if (!plan) return { ok: false, error: "Scheda non trovata." };
  const draft = planToDraft(plan);
  draft.name = `${draft.name} (copia)`.slice(0, 80);
  return savePlan(null, draft);
}

export async function deletePlan(planId: string): Promise<ActionResult> {
  await prisma.plan.delete({ where: { id: planId } }).catch(() => null);
  revalidatePath("/schede");
  revalidatePath("/");
  return { ok: true };
}

/** Importa una scheda da file JSON o da link condiviso, creando gli esercizi personalizzati mancanti. */
export async function importPlan(payload: unknown): Promise<ActionResult<{ id: string }>> {
  const parsed = planExportSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Il file non contiene una scheda valida di Carico." };
  try {
    await upsertCustomExercises(parsed.data.customExercises);
    const id = await writePlan(null, parsed.data.plan);
    revalidatePath("/schede");
    return { ok: true, data: { id } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Importazione non riuscita." };
  }
}
