/**
 * Scarica le immagini degli esercizi da free-exercise-db
 * (https://github.com/yuhonas/free-exercise-db, licenza Unlicense / pubblico dominio)
 * e le salva ridimensionate in public/exercises/<slug>/<n>.webp.
 *
 * Uso: npm run images:fetch            (salta le immagini già presenti)
 *      npm run images:fetch -- --force (riscarica tutto)
 *
 * Per sostituire un'immagine basta mettere un file 0.webp/0.jpg/0.png/0.svg
 * nella cartella dell'esercizio e rilanciare il seed.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { exerciseSeeds } from "../prisma/data";

const BASE = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises";
const OUT = path.join(__dirname, "..", "public", "exercises");
const force = process.argv.includes("--force");

function hasConvert(): boolean {
  try {
    execFileSync("convert", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const canConvert = hasConvert();
  if (!canConvert) console.warn("ImageMagick non trovato: salvo i JPG originali senza ridimensionarli.");
  let downloaded = 0;
  for (const ex of exerciseSeeds) {
    if (!ex.src) continue;
    const dir = path.join(OUT, ex.slug);
    mkdirSync(dir, { recursive: true });
    if (!force && readdirSync(dir).length > 0) continue;
    for (const n of [0, 1]) {
      const res = await fetch(`${BASE}/${ex.src}/${n}.jpg`);
      if (!res.ok) {
        if (n === 0) console.warn(`✗ ${ex.slug}: immagine non trovata (${ex.src})`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      const jpg = path.join(dir, `${n}.jpg`);
      writeFileSync(jpg, buf);
      if (canConvert) {
        execFileSync("convert", [jpg, "-strip", "-resize", "640x>", "-quality", "70", path.join(dir, `${n}.webp`)]);
        unlinkSync(jpg);
      }
      downloaded++;
    }
    process.stdout.write(".");
  }
  console.log(`\n✓ ${downloaded} immagini scaricate in ${OUT}`);
  if (!existsSync(OUT)) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
