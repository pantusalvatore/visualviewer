import type { Metadata } from "next";
import { ImportPlanButton } from "@/components/import-plan";
import { BackupCard, PreferencesCard } from "@/components/settings-panel";
import { Card, PageHeader } from "@/components/ui";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Impostazioni" };

export default async function SettingsPage() {
  const [exercises, custom, plans, sessions] = await Promise.all([
    prisma.exercise.count(),
    prisma.exercise.count({ where: { isCustom: true } }),
    prisma.plan.count(),
    prisma.workoutSession.count(),
  ]);
  return (
    <>
      <PageHeader eyebrow="Carico" title="Impostazioni" />
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <PreferencesCard />
          <BackupCard />
          <Card className="flex items-center justify-between gap-3 p-4 md:p-5">
            <div>
              <h2 className="text-lg font-extrabold">Importa una scheda</h2>
              <p className="text-sm text-muted">Da un file JSON esportato con “Esporta JSON”.</p>
            </div>
            <ImportPlanButton />
          </Card>
        </div>
        <div className="flex flex-col gap-4">
          <Card className="p-4 md:p-5">
            <h2 className="text-lg font-extrabold">I tuoi dati</h2>
            <dl className="mt-3 grid grid-cols-2 gap-3">
              {[
                ["Esercizi", exercises],
                ["Personalizzati", custom],
                ["Schede", plans],
                ["Allenamenti", sessions],
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl bg-surface-2 p-3">
                  <dt className="eyebrow">{label}</dt>
                  <dd className="text-2xl font-black tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-sm text-muted">Tutto è salvato nel database SQLite locale (prisma/dev.db): nessun servizio esterno.</p>
          </Card>
          <Card className="p-4 md:p-5">
            <h2 className="text-lg font-extrabold">Installa sul telefono</h2>
            <p className="mt-1 text-sm text-muted">
              Apri Carico dal browser del telefono e scegli “Aggiungi a schermata Home” (Safari: Condividi → Aggiungi alla schermata
              Home; Chrome: menu ⋮ → Installa app). Si aprirà a schermo intero come un&apos;app.
            </p>
          </Card>
          <Card className="p-4 md:p-5">
            <h2 className="text-lg font-extrabold">Crediti</h2>
            <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm text-muted">
              <li>
                Foto degli esercizi:{" "}
                <a className="font-semibold text-accent underline" href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">
                  free-exercise-db
                </a>{" "}
                di yuhonas, rilasciato nel pubblico dominio con licenza Unlicense.
              </li>
              <li>Testi in italiano, spiegazioni, errori comuni e consigli scritti appositamente per Carico.</li>
              <li>Mappe muscolari e icone disegnate in SVG per l&apos;app.</li>
            </ul>
            <p className="mt-3 text-xs text-muted">
              Le indicazioni hanno scopo informativo e non sostituiscono il parere di un medico o di un professionista qualificato.
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
