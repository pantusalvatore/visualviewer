import type { Metadata } from "next";
import Link from "next/link";
import { ExerciseImage } from "@/components/exercise-image";
import { Icon } from "@/components/icon";
import { Weight } from "@/components/settings";
import { Card, EmptyState, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import { MUSCLE_LABELS } from "@/lib/domain";
import { formatDuration } from "@/lib/progression";
import { getSessions, getTrackedExercises } from "@/lib/queries";

export const metadata: Metadata = { title: "Storico" };

const monthFmt = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric" });
const dayFmt = new Intl.DateTimeFormat("it-IT", { weekday: "short", day: "numeric" });

export default async function HistoryPage() {
  const [sessions, tracked] = await Promise.all([getSessions(), getTrackedExercises()]);
  const byMonth = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const key = monthFmt.format(s.startedAt);
    byMonth.set(key, [...(byMonth.get(key) ?? []), s]);
  }

  return (
    <>
      <PageHeader eyebrow="I tuoi allenamenti" title="Storico" />
      {sessions.length === 0 ? (
        <EmptyState icon="history" title="Nessun allenamento registrato" action={<LinkButton href="/schede" variant="primary" icon="play">Vai alle schede</LinkButton>}>
          Apri una scheda e premi “Inizia”: serie, carichi e ripetizioni verranno salvati qui.
        </EmptyState>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <section aria-label="Sessioni">
            {[...byMonth.entries()].map(([month, list]) => (
              <div key={month} className="mb-6">
                <SectionTitle>{month}</SectionTitle>
                <ul className="flex flex-col gap-2">
                  {list.map((s) => (
                    <li key={s.id}>
                      <Link href={`/storico/${s.id}`} className="flex items-center gap-4 rounded-2xl border border-line bg-surface p-4 hover:bg-surface-2">
                        <span className="flex w-12 shrink-0 flex-col items-center rounded-xl bg-surface-2 py-1.5 text-center leading-tight">
                          <span className="text-xs text-muted uppercase">{dayFmt.format(s.startedAt).split(" ")[0]}</span>
                          <span className="text-lg font-black">{s.startedAt.getDate()}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-bold">{s.dayName}</span>
                          <span className="block truncate text-sm text-muted">{s.planName}</span>
                          <span className="block text-sm text-muted tabular-nums">
                            {s.setCount} serie · {s.exerciseCount} esercizi
                            {s.finishedAt && ` · ${formatDuration(s.finishedAt.getTime() - s.startedAt.getTime())}`}
                          </span>
                        </span>
                        <span className="text-right text-sm tabular-nums">
                          <span className="block font-bold">
                            <Weight kg={s.volume} />
                          </span>
                          <span className="text-muted">volume</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
          <section aria-labelledby="progressi">
            <SectionTitle>
              <span id="progressi">Progressi per esercizio</span>
            </SectionTitle>
            <Card>
              <ul className="divide-y divide-line">
                {tracked.map(({ exercise: e, setCount, maxWeight }) => (
                  <li key={e.id}>
                    <Link href={`/storico/esercizio/${e.slug}`} className="flex items-center gap-3 p-3 hover:bg-surface-2/60">
                      <ExerciseImage src={e.image} alt="" primary={e.primaryMuscle} className="size-11 shrink-0 rounded-lg" sizes="44px" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{e.name}</span>
                        <span className="text-xs text-muted">
                          {MUSCLE_LABELS[e.primaryMuscle]} · {setCount} serie
                        </span>
                      </span>
                      <span className="text-sm font-bold tabular-nums">{maxWeight > 0 && <Weight kg={maxWeight} />}</span>
                      <Icon name="chart" size={18} className="text-muted" />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </div>
      )}
    </>
  );
}
