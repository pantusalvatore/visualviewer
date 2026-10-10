"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { importPlan } from "@/lib/actions/plans";
import { GOAL_LABELS, LEVEL_LABELS } from "@/lib/domain";
import type { PlanExport } from "@/lib/plan-schema";
import { decodeShare } from "@/lib/share";
import { formatReps } from "./builder/state";
import { Badge, Button, Card, EmptyState, SectionTitle } from "./ui";

/** Legge la scheda dal frammento #… del link e permette di salvarla. */
export function ShareImport({ names }: { names: Record<string, string> }) {
  const router = useRouter();
  const [data, setData] = useState<PlanExport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lettura del frammento disponibile solo nel browser
      setError("Il link non contiene alcuna scheda.");
      return;
    }
    decodeShare(hash).then(setData, (e: Error) => setError(e.message));
  }, []);

  if (error) return <EmptyState icon="alert" title="Impossibile aprire la scheda">{error}</EmptyState>;
  if (!data) return <div className="h-64 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Caricamento" />;

  const customNames = Object.fromEntries(data.customExercises.map((e) => [e.slug, e.name]));
  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <Card className="p-4">
        <h2 className="text-2xl font-extrabold">{data.plan.name}</h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge tone="accent">{GOAL_LABELS[data.plan.goal]}</Badge>
          <Badge>{LEVEL_LABELS[data.plan.level]}</Badge>
          <Badge>{data.plan.daysPerWeek}× / settimana</Badge>
        </div>
        {data.plan.notes && <p className="mt-2 text-muted">{data.plan.notes}</p>}
      </Card>
      {data.plan.days.map((d, i) => (
        <Card key={i} className="p-4">
          <SectionTitle>{d.name}</SectionTitle>
          <ol className="flex flex-col gap-1.5">
            {d.items.map((it, j) => (
              <li key={j} className="flex justify-between gap-3">
                <span>
                  {j + 1}. {names[it.exerciseSlug] ?? customNames[it.exerciseSlug] ?? it.exerciseSlug}
                </span>
                <span className="font-bold tabular-nums">
                  {it.sets} × {formatReps(it.repsMin, it.repsMax)}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      ))}
      {error === null && (
        <Button
          variant="primary"
          size="lg"
          icon="download"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await importPlan(data);
              if (res.ok) router.push(`/schede/${res.data.id}`);
              else setError(res.error);
            })
          }
        >
          {pending ? "Salvataggio…" : "Salva tra le mie schede"}
        </Button>
      )}
    </div>
  );
}
