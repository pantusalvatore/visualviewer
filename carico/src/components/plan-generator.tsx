"use client";

import { useState } from "react";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  GOALS,
  GOAL_LABELS,
  LEVELS,
  LEVEL_LABELS,
  MUSCLE_LABELS,
  type Equipment,
  type Goal,
  type Level,
} from "@/lib/domain";
import type { ExerciseSummary } from "@/lib/exercise";
import { generatePlan } from "@/lib/generator";
import type { PlanDraft } from "@/lib/plan-schema";
import { PlanBuilder } from "./builder/plan-builder";
import { formatReps, formatRest } from "./builder/state";
import { Badge, Button, Card, ChoiceChips, SectionTitle } from "./ui";

const SELECTABLE_EQUIPMENT = EQUIPMENT.filter((e) => e !== "corpo-libero");

export function PlanGenerator({ exercises }: { exercises: ExerciseSummary[] }) {
  const [goal, setGoal] = useState<Goal>("ipertrofia");
  const [level, setLevel] = useState<Level>("intermedio");
  const [days, setDays] = useState(3);
  const [equipment, setEquipment] = useState<Equipment[]>([...SELECTABLE_EQUIPMENT]);
  const [seed, setSeed] = useState(1);
  const [draft, setDraft] = useState<PlanDraft | null>(null);
  const [editing, setEditing] = useState(false);
  const bySlug = new Map(exercises.map((e) => [e.slug, e]));

  function generate(nextSeed = seed) {
    const pool = exercises.map((e) => ({
      slug: e.slug,
      primaryMuscle: e.primaryMuscle,
      equipment: e.equipment,
      level: e.level,
      type: e.type,
    }));
    setDraft(generatePlan({ goal, level, daysPerWeek: days, equipment, seed: nextSeed }, pool));
  }

  if (draft && editing) {
    return <PlanBuilder planId={null} initial={draft} exercises={exercises} cancelHref="/schede" />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <Card className="flex flex-col gap-5 p-4 md:p-5 lg:sticky lg:top-8">
        <ChoiceChips name="goal" legend="Obiettivo" value={goal} options={GOALS.map((g) => ({ value: g, label: GOAL_LABELS[g] }))} onChange={setGoal} />
        <ChoiceChips name="level" legend="Livello" value={level} options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))} onChange={setLevel} />
        <ChoiceChips
          name="days"
          legend="Giorni a settimana"
          value={String(days)}
          options={["1", "2", "3", "4", "5", "6"].map((d) => ({ value: d, label: d }))}
          onChange={(d) => setDays(Number(d))}
        />
        <ChoiceChips
          name="equipment"
          legend="Attrezzatura disponibile (il corpo libero è sempre incluso)"
          multiple
          value={equipment}
          options={SELECTABLE_EQUIPMENT.map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))}
          onChange={(e) => setEquipment((list) => (list.includes(e) ? list.filter((x) => x !== e) : [...list, e]))}
        />
        <Button variant="primary" size="lg" icon="sparkle" onClick={() => generate()}>
          {draft ? "Aggiorna proposta" : "Genera scheda"}
        </Button>
      </Card>

      <section aria-live="polite" aria-label="Proposta">
        {!draft ? (
          <div className="rounded-2xl border border-dashed border-line p-8 text-muted">
            <p className="text-lg font-bold text-ink">Come funziona</p>
            <ul className="mt-3 list-disc space-y-1.5 pl-5">
              <li>Sceglie lo split più adatto: full body, push/pull/gambe o parte alta/bassa.</li>
              <li>Copre tutti i grandi gruppi muscolari, alternando multiarticolari e isolamento.</li>
              <li>Imposta serie, ripetizioni e recuperi in base all&apos;obiettivo.</li>
              <li>Usa solo esercizi adatti al tuo livello e alla tua attrezzatura.</li>
            </ul>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-xl font-extrabold">{draft.name}</h2>
              <Button
                icon="sparkle"
                onClick={() => {
                  setSeed(seed + 1);
                  generate(seed + 1);
                }}
              >
                Rigenera
              </Button>
              <Button variant="primary" icon="edit" onClick={() => setEditing(true)}>
                Personalizza e salva
              </Button>
            </div>
            {draft.days.map((d) => (
              <Card key={d.name} className="p-4">
                <SectionTitle>{d.name}</SectionTitle>
                <ol className="flex flex-col gap-2">
                  {d.items.map((i, idx) => {
                    const e = bySlug.get(i.exerciseSlug);
                    return (
                      <li key={idx} className="flex items-center gap-3">
                        <span className="w-5 text-sm font-bold text-muted tabular-nums">{idx + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{e?.name ?? i.exerciseSlug}</span>
                          <span className="text-xs text-muted">{e && MUSCLE_LABELS[e.primaryMuscle]}</span>
                        </span>
                        {i.superset && <Badge tone="accent">SS {i.superset}</Badge>}
                        <span className="text-right text-sm tabular-nums">
                          <span className="block font-bold">
                            {i.sets} × {formatReps(i.repsMin, i.repsMax)}
                          </span>
                          <span className="text-muted">{i.notes ?? formatRest(i.restSeconds)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
