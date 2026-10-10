import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { formatReps, formatRest } from "@/components/builder/state";
import { ExerciseImage } from "@/components/exercise-image";
import { PlanActions } from "@/components/plan-actions";
import { Weight } from "@/components/settings";
import { Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { GOAL_LABELS, LEVEL_LABELS, MUSCLE_LABELS, isOneOf, GOALS, LEVELS } from "@/lib/domain";
import { toExerciseSummary } from "@/lib/exercise";
import { getPlan, planToExport } from "@/lib/queries";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await getPlan((await params).id);
  return { title: plan?.name ?? "Scheda" };
}

export default async function PlanPage({ params }: Props) {
  const { id } = await params;
  const plan = await getPlan(id);
  if (!plan) notFound();
  const goal = isOneOf(GOALS, plan.goal) ? GOAL_LABELS[plan.goal] : plan.goal;
  const level = isOneOf(LEVELS, plan.level) ? LEVEL_LABELS[plan.level] : plan.level;
  const totalExercises = plan.days.reduce((n, d) => n + d.items.length, 0);

  return (
    <>
      <PageHeader back={{ href: "/schede", label: "Schede" }} eyebrow="Scheda" title={plan.name}>
        <div className="flex flex-wrap gap-1.5">
          <Badge tone="accent">{goal}</Badge>
          <Badge>{level}</Badge>
          <Badge>{plan.daysPerWeek}× / settimana</Badge>
          <Badge>
            {plan.days.length} {plan.days.length === 1 ? "giorno" : "giorni"} · {totalExercises} esercizi
          </Badge>
        </div>
        {plan.notes && <p className="max-w-2xl text-muted">{plan.notes}</p>}
      </PageHeader>

      <div className="mb-6">
        <PlanActions planId={plan.id} exportData={planToExport(plan)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {plan.days.map((day) => (
          <Card key={day.id} className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-line p-4">
              <div>
                <h2 className="text-xl font-extrabold">{day.name}</h2>
                <p className="text-sm text-muted">
                  {day.items.length} esercizi · {day.items.reduce((n, i) => n + i.sets, 0)} serie
                </p>
              </div>
              <LinkButton href={`/allenamento/${plan.id}/${day.id}`} variant="primary" icon="play">
                Inizia
              </LinkButton>
            </div>
            {day.items.length === 0 ? (
              <p className="p-4 text-muted">Nessun esercizio in questo giorno.</p>
            ) : (
              <ol className="divide-y divide-line">
                {day.items.map((item, i) => {
                  const ex = toExerciseSummary(item.exercise);
                  const prev = day.items[i - 1];
                  const next = day.items[i + 1];
                  const inSuperset = !!item.superset && (prev?.superset === item.superset || next?.superset === item.superset);
                  return (
                    <li key={item.id} className={inSuperset ? "border-l-4 border-l-accent" : ""}>
                      <Link href={`/esercizi/${ex.slug}`} className="flex items-center gap-3 p-3 hover:bg-surface-2/60">
                        <ExerciseImage src={ex.image} alt="" primary={ex.primaryMuscle} className="size-14 shrink-0 rounded-lg" sizes="56px" />
                        <div className="min-w-0 flex-1">
                          <p className="flex items-center gap-2">
                            <span className="truncate font-bold">{ex.name}</span>
                            {inSuperset && <Badge tone="accent">SS {item.superset}</Badge>}
                          </p>
                          <p className="text-sm text-muted">
                            {MUSCLE_LABELS[ex.primaryMuscle]}
                            {item.tempo && ` · tempo ${item.tempo}`}
                          </p>
                          {item.notes && <p className="text-sm italic">{item.notes}</p>}
                        </div>
                        <dl className="grid shrink-0 grid-cols-[auto_auto] gap-x-2 text-right text-sm">
                          <dt className="sr-only">Serie e ripetizioni</dt>
                          <dd className="col-span-2 text-base font-extrabold tabular-nums">
                            {item.sets} × {formatReps(item.repsMin, item.repsMax)}
                          </dd>
                          <dt className="sr-only">Carico</dt>
                          <dd className="col-span-2 text-muted tabular-nums">
                            {item.load ? <Weight kg={item.load} /> : null}
                            {item.load ? " · " : ""}
                            {formatRest(item.restSeconds)}
                          </dd>
                        </dl>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
