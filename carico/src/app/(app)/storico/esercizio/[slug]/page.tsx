import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProgressChart } from "@/components/progress-chart";
import { Weight } from "@/components/settings";
import { Card, EmptyState, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { MUSCLE_LABELS } from "@/lib/domain";
import { buildProgression, personalRecords, progressDelta } from "@/lib/progression";
import { getExerciseBySlug, getExerciseHistory } from "@/lib/queries";

export const metadata: Metadata = { title: "Progressi" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short", year: "numeric" });

export default async function ExerciseProgressPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  if (!ex) notFound();
  const history = await getExerciseHistory(ex.id);
  const points = buildProgression(history);
  const records = personalRecords(points);
  const bodyweight = points.every((p) => p.maxWeight === 0);
  const delta = progressDelta(points, bodyweight ? "totalReps" : "e1rm");

  return (
    <>
      <PageHeader back={{ href: "/storico", label: "Storico" }} eyebrow={`Progressi · ${MUSCLE_LABELS[ex.primaryMuscle]}`} title={ex.name}>
        <LinkButton href={`/esercizi/${ex.slug}`} size="sm" className="w-fit" icon="info">
          Scheda esercizio
        </LinkButton>
      </PageHeader>
      {points.length === 0 ? (
        <EmptyState icon="chart" title="Nessun dato ancora">
          Registra questo esercizio in un allenamento per vedere i progressi.
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card className="p-4">
            <ProgressChart points={points.map((p) => ({ ...p, date: p.date.toISOString() }))} bodyweight={bodyweight} />
          </Card>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <Card className="p-3">
                <p className="eyebrow">Carico max</p>
                <p className="text-2xl font-black">{records ? <Weight kg={records.maxWeight} /> : "–"}</p>
              </Card>
              <Card className="p-3">
                <p className="eyebrow">1RM stimato</p>
                <p className="text-2xl font-black">{records ? <Weight kg={records.e1rm} /> : "–"}</p>
              </Card>
              <Card className="p-3">
                <p className="eyebrow">Sessioni</p>
                <p className="text-2xl font-black">{points.length}</p>
              </Card>
              <Card className="p-3">
                <p className="eyebrow">Variazione</p>
                <p className={`text-2xl font-black ${delta !== null && delta > 0 ? "text-ok" : ""}`}>
                  {delta === null ? "–" : `${delta > 0 ? "+" : ""}${String(delta).replace(".", ",")}%`}
                </p>
              </Card>
            </div>
            <SectionTitle>Sessioni</SectionTitle>
            <ul className="flex flex-col gap-2">
              {[...history].reverse().map((h) => (
                <li key={h.id}>
                  <Link href={`/storico/${h.id}`} className="block rounded-xl border border-line bg-surface p-3 hover:bg-surface-2">
                    <span className="block text-sm font-bold">{dateFmt.format(h.date)}</span>
                    <span className="block text-sm text-muted tabular-nums">
                      {h.sets.map((s, i) => (
                        <span key={i}>
                          {i > 0 && " · "}
                          <Weight kg={s.weight} />×{s.reps}
                        </span>
                      ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  );
}
