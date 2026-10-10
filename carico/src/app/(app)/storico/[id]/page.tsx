import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteSessionButton } from "@/components/delete-session";
import { ExerciseImage } from "@/components/exercise-image";
import { Weight } from "@/components/settings";
import { Card, PageHeader } from "@/components/ui";
import { toExerciseSummary } from "@/lib/exercise";
import { bestSet, estimate1RM, formatDuration } from "@/lib/progression";
import { getSession } from "@/lib/queries";

export const metadata: Metadata = { title: "Allenamento" };

const dateFmt = new Intl.DateTimeFormat("it-IT", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });

export default async function SessionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ nuovo?: string }> }) {
  const { id } = await params;
  const { nuovo } = await searchParams;
  const session = await getSession(id);
  if (!session) notFound();

  const groups = new Map<string, { exercise: ReturnType<typeof toExerciseSummary>; sets: { setNumber: number; weight: number; reps: number }[] }>();
  for (const s of session.sets) {
    const key = `${s.position}-${s.exerciseId}`;
    const g = groups.get(key) ?? { exercise: toExerciseSummary(s.exercise), sets: [] };
    g.sets.push({ setNumber: s.setNumber, weight: s.weight, reps: s.reps });
    groups.set(key, g);
  }
  const volume = session.sets.reduce((n, s) => n + s.weight * s.reps, 0);
  const stats = [
    { label: "Durata", value: session.finishedAt ? formatDuration(session.finishedAt.getTime() - session.startedAt.getTime()) : "–" },
    { label: "Serie", value: String(session.sets.length) },
    { label: "Ripetizioni", value: String(session.sets.reduce((n, s) => n + s.reps, 0)) },
  ];

  return (
    <>
      <PageHeader back={{ href: "/storico", label: "Storico" }} eyebrow={session.planName} title={session.dayName}>
        <p className="-mt-1 text-muted first-letter:uppercase">{dateFmt.format(session.startedAt)}</p>
      </PageHeader>
      {nuovo && (
        <p role="status" className="mb-5 rounded-2xl bg-ok-soft p-4 font-bold text-ok">
          Allenamento salvato. Ottimo lavoro! 💪
        </p>
      )}
      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="p-3">
            <p className="eyebrow">{s.label}</p>
            <p className="text-2xl font-black tabular-nums">{s.value}</p>
          </Card>
        ))}
        <Card className="p-3">
          <p className="eyebrow">Volume</p>
          <p className="text-2xl font-black tabular-nums">
            <Weight kg={volume} />
          </p>
        </Card>
      </div>
      {session.notes && <p className="mb-6 rounded-2xl bg-surface-2 p-4 italic">{session.notes}</p>}
      <div className="grid gap-3 md:grid-cols-2">
        {[...groups.values()].map(({ exercise: e, sets }) => {
          const best = bestSet(sets);
          return (
            <Card key={e.id + sets[0]!.setNumber} className="p-3">
              <Link href={`/storico/esercizio/${e.slug}`} className="mb-2 flex items-center gap-3">
                <ExerciseImage src={e.image} alt="" primary={e.primaryMuscle} className="size-12 shrink-0 rounded-lg" sizes="48px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold">{e.name}</span>
                  {best && best.weight > 0 && (
                    <span className="text-sm text-muted">
                      1RM stimato: <Weight kg={Math.round(estimate1RM(best.weight, best.reps) * 2) / 2} />
                    </span>
                  )}
                </span>
              </Link>
              <ol className="grid grid-cols-[repeat(auto-fill,minmax(5.5rem,1fr))] gap-1.5">
                {sets.map((s) => (
                  <li key={s.setNumber} className="rounded-lg bg-surface-2 px-2 py-1.5 text-center text-sm tabular-nums">
                    <span className="block text-xs text-muted">Serie {s.setNumber}</span>
                    <strong>
                      <Weight kg={s.weight} />
                    </strong>{" "}
                    × {s.reps}
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </div>
      <div className="mt-8">
        <DeleteSessionButton id={session.id} />
      </div>
    </>
  );
}
