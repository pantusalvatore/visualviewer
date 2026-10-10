/**
 * Popola il database con gli esercizi di prisma/data.
 * È idempotente: aggiorna i contenuti degli esercizi esistenti (per slug)
 * senza toccare preferiti, note ed esercizi personalizzati.
 */
import { PrismaClient } from "@prisma/client";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { exerciseSeeds } from "./data";
import { BREATH_PRESETS, type ExerciseSeed } from "./data/types";
import type { Instructions } from "../src/lib/domain";

const prisma = new PrismaClient();
const IMAGES_DIR = path.join(__dirname, "..", "public", "exercises");
const IMAGE_EXT = /\.(webp|jpe?g|png|svg|avif)$/i;
export const FREE_EXERCISE_DB_CREDIT =
  "Foto: free-exercise-db (github.com/yuhonas/free-exercise-db), pubblico dominio – Unlicense";

/** Le immagini sono semplicemente i file presenti in public/exercises/<slug>/, in ordine alfabetico. */
function imagesFor(slug: string): string[] {
  const dir = path.join(IMAGES_DIR, slug);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => IMAGE_EXT.test(f))
    .sort()
    .map((f) => `/exercises/${slug}/${f}`);
}

function instructionsFor(e: ExerciseSeed): Instructions {
  const breath = e.breath ?? "standard";
  return {
    partenza: e.start,
    esecuzione: e.exec,
    finale: e.end,
    respirazione: typeof breath === "string" ? BREATH_PRESETS[breath] : breath,
  };
}

async function main() {
  let created = 0;
  let updated = 0;
  for (const e of exerciseSeeds) {
    const images = imagesFor(e.slug);
    const data = {
      name: e.name,
      nameEn: e.nameEn ?? null,
      primaryMuscle: e.primary,
      secondaryMuscles: JSON.stringify(e.secondary),
      equipment: e.equipment,
      level: e.level,
      type: e.type,
      instructions: JSON.stringify(instructionsFor(e)),
      mistakes: JSON.stringify(e.mistakes),
      safety: JSON.stringify(e.safety),
      easier: JSON.stringify(e.easier),
      harder: JSON.stringify(e.harder),
      images: JSON.stringify(images),
      imageCredit: images.length > 0 && e.src ? FREE_EXERCISE_DB_CREDIT : null,
    };
    const existing = await prisma.exercise.findUnique({ where: { slug: e.slug }, select: { id: true } });
    if (existing) {
      await prisma.exercise.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.exercise.create({ data: { ...data, slug: e.slug } });
      created++;
    }
  }
  console.log(`✓ Esercizi: ${created} creati, ${updated} aggiornati (totale seed: ${exerciseSeeds.length}).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
