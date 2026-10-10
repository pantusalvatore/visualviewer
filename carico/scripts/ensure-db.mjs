// Crea il database SQLite e lo popola con il seed al primo avvio,
// così `npm install && npm run dev` funziona senza passaggi manuali.
import { existsSync, copyFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envFile = path.join(root, ".env");
if (!existsSync(envFile)) copyFileSync(path.join(root, ".env.example"), envFile);

const dbFile = path.join(root, "prisma", "dev.db");
const run = (cmd) => execSync(cmd, { cwd: root, stdio: "inherit" });

if (!existsSync(dbFile)) {
  console.log("› Database non trovato: lo creo e carico gli esercizi…");
  run("npx prisma db push --skip-generate");
  run("npx prisma db seed");
} else {
  // Allinea lo schema in caso di aggiornamenti (non distruttivo).
  run("npx prisma db push --skip-generate");
}
