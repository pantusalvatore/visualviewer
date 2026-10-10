"use server";

import { revalidatePath } from "next/cache";
import { ALL_MUSCLES } from "../domain";
import { customExerciseSchema, zodErrorMap } from "../plan-schema";
import { prisma } from "../prisma";
import { uniqueCustomSlug } from "../custom-exercises";
import type { ActionResult } from "./plans";

export async function toggleFavorite(id: string): Promise<boolean> {
  const ex = await prisma.exercise.findUnique({ where: { id }, select: { favorite: true, slug: true } });
  if (!ex) return false;
  await prisma.exercise.update({ where: { id }, data: { favorite: !ex.favorite } });
  revalidatePath("/esercizi");
  revalidatePath(`/esercizi/${ex.slug}`);
  return !ex.favorite;
}

export async function saveExerciseNotes(id: string, notes: string): Promise<ActionResult> {
  const text = notes.trim().slice(0, 2000);
  const ex = await prisma.exercise.update({ where: { id }, data: { notes: text || null }, select: { slug: true } });
  revalidatePath(`/esercizi/${ex.slug}`);
  return { ok: true };
}

const MAX_PHOTO_BYTES = 6 * 1024 * 1024;
const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

/** Le liste testuali del form arrivano come "una voce per riga". */
function lines(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((l) => l.replace(/^\s*(\d+[.)]|[-•*])\s*/, "").trim())
    .filter(Boolean);
}

function readForm(form: FormData) {
  return {
    name: String(form.get("name") ?? ""),
    nameEn: String(form.get("nameEn") ?? ""),
    primaryMuscle: String(form.get("primaryMuscle") ?? ""),
    secondaryMuscles: form.getAll("secondaryMuscles").map(String).filter((m) => (ALL_MUSCLES as readonly string[]).includes(m)),
    equipment: String(form.get("equipment") ?? ""),
    level: String(form.get("level") ?? ""),
    type: String(form.get("type") ?? ""),
    instructions: {
      partenza: lines(form.get("partenza")),
      esecuzione: lines(form.get("esecuzione")),
      finale: lines(form.get("finale")),
      respirazione: lines(form.get("respirazione")),
    },
    mistakes: lines(form.get("mistakes")),
    safety: lines(form.get("safety")),
    easier: lines(form.get("easier")),
    harder: lines(form.get("harder")),
    notes: String(form.get("notes") ?? ""),
  };
}

const formSchema = customExerciseSchema.omit({ slug: true }).extend({
  instructions: customExerciseSchema.shape.instructions.refine((i) => i.esecuzione.length > 0, {
    message: "Descrivi almeno un passo dell'esecuzione",
  }),
});

async function storePhoto(file: FormDataEntryValue | null): Promise<string | null | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return null;
  if (!PHOTO_TYPES.includes(file.type)) return { error: "Formato immagine non supportato (usa JPG, PNG o WebP)." };
  if (file.size > MAX_PHOTO_BYTES) return { error: "L'immagine supera i 6 MB." };
  const media = await prisma.media.create({
    data: { mime: file.type, data: Buffer.from(await file.arrayBuffer()) },
    select: { id: true },
  });
  return `/api/media/${media.id}`;
}

export async function saveCustomExercise(
  existingId: string | null,
  _prev: unknown,
  form: FormData,
): Promise<ActionResult<{ slug: string }>> {
  const parsed = formSchema.safeParse(readForm(form));
  if (!parsed.success) return { ok: false, error: "Controlla i campi evidenziati.", fieldErrors: zodErrorMap(parsed.error) };

  const photo = await storePhoto(form.get("photo"));
  if (photo && typeof photo === "object") return { ok: false, error: photo.error, fieldErrors: { photo: photo.error } };

  const e = parsed.data;
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

  let slug: string;
  if (existingId) {
    const current = await prisma.exercise.findUnique({ where: { id: existingId }, select: { images: true, isCustom: true } });
    if (!current?.isCustom) return { ok: false, error: "Puoi modificare solo i tuoi esercizi personalizzati." };
    const images: string[] = JSON.parse(current.images || "[]");
    const removePhoto = form.get("removePhoto") === "1";
    const nextImages = photo ? [photo] : removePhoto ? [] : images;
    const updated = await prisma.exercise.update({
      where: { id: existingId },
      data: { ...data, images: JSON.stringify(nextImages) },
      select: { slug: true },
    });
    slug = updated.slug;
  } else {
    slug = await uniqueCustomSlug(e.name);
    await prisma.exercise.create({ data: { ...data, slug, images: JSON.stringify(photo ? [photo] : []) } });
  }
  revalidatePath("/esercizi");
  revalidatePath(`/esercizi/${slug}`);
  return { ok: true, data: { slug } };
}

export async function deleteCustomExercise(id: string): Promise<ActionResult> {
  const ex = await prisma.exercise.findUnique({ where: { id }, select: { isCustom: true, _count: { select: { planItems: true } } } });
  if (!ex?.isCustom) return { ok: false, error: "Puoi eliminare solo i tuoi esercizi personalizzati." };
  if (ex._count.planItems > 0) return { ok: false, error: "L'esercizio è usato in una scheda: rimuovilo prima dalla scheda." };
  await prisma.exercise.delete({ where: { id } });
  revalidatePath("/esercizi");
  return { ok: true };
}

