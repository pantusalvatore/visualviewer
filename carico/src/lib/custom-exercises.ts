import "server-only";
import type { CustomExerciseExport } from "./plan-schema";
import { prisma } from "./prisma";

/** Crea (o aggiorna) gli esercizi personalizzati importati da un file o da un link. */
export async function upsertCustomExercises(list: CustomExerciseExport[]): Promise<void> {
  for (const e of list) {
    const existing = await prisma.exercise.findUnique({ where: { slug: e.slug }, select: { id: true, isCustom: true } });
    // Non sovrascrivere mai un esercizio del database di base con uno importato.
    if (existing && !existing.isCustom) continue;
    const data = {
      name: e.name,
      nameEn: e.nameEn,
      primaryMuscle: e.primaryMuscle,
      secondaryMuscles: JSON.stringify(e.secondaryMuscles),
      equipment: e.equipment,
      level: e.level,
      type: e.type,
      instructions: JSON.stringify(e.instructions),
      mistakes: JSON.stringify(e.mistakes),
      safety: JSON.stringify(e.safety),
      easier: JSON.stringify(e.easier),
      harder: JSON.stringify(e.harder),
      notes: e.notes,
      isCustom: true,
    };
    if (existing) await prisma.exercise.update({ where: { id: existing.id }, data });
    else await prisma.exercise.create({ data: { ...data, slug: e.slug } });
  }
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

/** Slug univoco per un nuovo esercizio personalizzato. */
export async function uniqueCustomSlug(name: string): Promise<string> {
  const base = `mio-${slugify(name) || "esercizio"}`;
  let slug = base;
  for (let n = 2; await prisma.exercise.findUnique({ where: { slug }, select: { id: true } }); n++) slug = `${base}-${n}`;
  return slug;
}
