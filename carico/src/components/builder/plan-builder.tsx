"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  horizontalListSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { savePlan } from "@/lib/actions/plans";
import { GOALS, GOAL_LABELS, LEVELS, LEVEL_LABELS } from "@/lib/domain";
import type { ExerciseSummary } from "@/lib/exercise";
import { planDraftSchema, zodErrorMap, type PlanDraft } from "@/lib/plan-schema";
import { useSettings } from "../settings";
import { ExercisePicker } from "../exercise-picker";
import { Icon } from "../icon";
import { Button, Card, ChoiceChips, cx, EmptyState, Field, IconButton, inputClass, textareaClass } from "../ui";
import { BuilderItemCard } from "./builder-item";
import { fromBuilderState, newItem, toBuilderState, uid, type BuilderDay, type BuilderItem, type BuilderState } from "./state";

const DAY_NAME_PRESETS = ["Push", "Pull", "Gambe", "Parte alta", "Parte bassa", "Full body"];

type BuilderProps = {
  planId: string | null;
  initial: PlanDraft;
  exercises: ExerciseSummary[];
  cancelHref: string;
};

/** Attende le preferenze del dispositivo (unità di misura) prima di inizializzare i carichi. */
export function PlanBuilder(props: BuilderProps) {
  const { ready } = useSettings();
  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Caricamento" />;
  return <PlanBuilderInner {...props} />;
}

function PlanBuilderInner({
  planId,
  initial,
  exercises,
  cancelHref,
}: BuilderProps) {
  const router = useRouter();
  const { unit } = useSettings();
  const [state, setState] = useState<BuilderState>(() => toBuilderState(initial, unit));
  const [activeDay, setActiveDay] = useState(state.days[0]?.uid ?? "");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  const bySlug = useMemo(() => new Map(exercises.map((e) => [e.slug, e])), [exercises]);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const dayIndex = Math.max(0, state.days.findIndex((d) => d.uid === activeDay));
  const day = state.days[dayIndex];

  const update = (patch: Partial<BuilderState>) => setState((s) => ({ ...s, ...patch }));
  const updateDay = (dayUid: string, fn: (d: BuilderDay) => BuilderDay) =>
    setState((s) => ({ ...s, days: s.days.map((d) => (d.uid === dayUid ? fn(d) : d)) }));
  const updateItem = (dayUid: string, itemUid: string, patch: Partial<BuilderItem>) =>
    updateDay(dayUid, (d) => ({ ...d, items: d.items.map((i) => (i.uid === itemUid ? { ...i, ...patch } : i)) }));

  function addDay(name?: string) {
    const letter = String.fromCharCode(65 + state.days.length);
    const d: BuilderDay = { uid: uid("day"), name: name ?? `Giorno ${letter}`, items: [] };
    setState((s) => ({ ...s, days: [...s.days, d], daysPerWeek: Math.max(s.daysPerWeek, s.days.length + 1) }));
    setActiveDay(d.uid);
  }

  function removeDay(dayUid: string) {
    const target = state.days.find((d) => d.uid === dayUid);
    if (target && target.items.length > 0 && !confirm(`Eliminare "${target.name}" e i suoi esercizi?`)) return;
    const remaining = state.days.filter((d) => d.uid !== dayUid);
    setState((s) => ({ ...s, days: remaining }));
    setActiveDay(remaining[Math.max(0, dayIndex - 1)]?.uid ?? "");
  }

  function onDaysDragEnd(e: DragEndEvent) {
    if (!e.over || e.active.id === e.over.id) return;
    setState((s) => {
      const from = s.days.findIndex((d) => d.uid === e.active.id);
      const to = s.days.findIndex((d) => d.uid === e.over!.id);
      return { ...s, days: arrayMove(s.days, from, to) };
    });
  }

  function onItemsDragEnd(e: DragEndEvent) {
    if (!day || !e.over || e.active.id === e.over.id) return;
    updateDay(day.uid, (d) => {
      const from = d.items.findIndex((i) => i.uid === e.active.id);
      const to = d.items.findIndex((i) => i.uid === e.over!.id);
      return { ...d, items: arrayMove(d.items, from, to) };
    });
  }

  function save() {
    setFormError(null);
    const draft = fromBuilderState(state, unit);
    const parsed = planDraftSchema.safeParse(draft);
    if (!parsed.success) {
      const map = zodErrorMap(parsed.error);
      setErrors(map);
      setFormError("Ci sono alcuni campi da correggere.");
      const firstDay = Object.keys(map).find((k) => k.startsWith("days."))?.split(".")[1];
      if (firstDay !== undefined && state.days[Number(firstDay)]) setActiveDay(state.days[Number(firstDay)]!.uid);
      return;
    }
    setErrors({});
    startSaving(async () => {
      const res = await savePlan(planId, draft);
      if (res.ok) {
        router.push(`/schede/${res.data.id}`);
        router.refresh();
      } else {
        setErrors(res.fieldErrors ?? {});
        setFormError(res.error);
      }
    });
  }

  /** Errori di un esercizio, con le chiavi ridotte al nome del campo. */
  function itemErrors(dIdx: number, iIdx: number): Record<string, string> {
    const prefix = `days.${dIdx}.items.${iIdx}.`;
    return Object.fromEntries(
      Object.entries(errors)
        .filter(([k]) => k.startsWith(prefix))
        .map(([k, v]) => [k.slice(prefix.length), v]),
    );
  }

  const dayErrorCount = (dIdx: number) => Object.keys(errors).filter((k) => k.startsWith(`days.${dIdx}.`)).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:items-start">
      {/* Dati generali */}
      <Card className="flex flex-col gap-5 p-4 md:p-5 lg:sticky lg:top-8">
        <Field label="Nome della scheda" htmlFor="plan-name" error={errors.name}>
          <input
            id="plan-name"
            className={inputClass}
            value={state.name}
            maxLength={80}
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "plan-name-error" : undefined}
            onChange={(e) => update({ name: e.target.value })}
          />
        </Field>
        <ChoiceChips
          name="goal"
          legend="Obiettivo"
          value={state.goal}
          options={GOALS.map((g) => ({ value: g, label: GOAL_LABELS[g] }))}
          onChange={(goal) => update({ goal })}
          error={errors.goal}
        />
        <ChoiceChips
          name="level"
          legend="Livello"
          value={state.level}
          options={LEVELS.map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
          onChange={(level) => update({ level })}
          error={errors.level}
        />
        <Field label="Allenamenti a settimana" htmlFor="plan-dpw" error={errors.daysPerWeek}>
          <div className="flex items-center gap-2">
            <IconButton icon="minus" label="Uno in meno" className="border border-line" onClick={() => update({ daysPerWeek: Math.max(1, state.daysPerWeek - 1) })} />
            <input
              id="plan-dpw"
              type="number"
              inputMode="numeric"
              min={1}
              max={7}
              className={cx(inputClass, "w-20 text-center text-lg font-bold")}
              value={state.daysPerWeek}
              onChange={(e) => update({ daysPerWeek: Number(e.target.value) })}
            />
            <IconButton icon="plus" label="Uno in più" className="border border-line" onClick={() => update({ daysPerWeek: Math.min(7, state.daysPerWeek + 1) })} />
          </div>
        </Field>
        <Field label="Note (facoltative)" htmlFor="plan-notes" error={errors.notes}>
          <textarea
            id="plan-notes"
            className={textareaClass}
            maxLength={1000}
            value={state.notes}
            onChange={(e) => update({ notes: e.target.value })}
          />
        </Field>
      </Card>

      {/* Giorni ed esercizi */}
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex items-center gap-2">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDaysDragEnd}>
            <SortableContext items={state.days.map((d) => d.uid)} strategy={horizontalListSortingStrategy}>
              <ul className="-mx-4 flex min-w-0 flex-1 gap-2 overflow-x-auto px-4 py-1 md:mx-0 md:px-0" role="tablist" aria-label="Giorni della scheda">
                {state.days.map((d, i) => (
                  <DayTab
                    key={d.uid}
                    day={d}
                    active={d.uid === day?.uid}
                    errorCount={dayErrorCount(i)}
                    onSelect={() => setActiveDay(d.uid)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          <Button icon="plus" onClick={() => addDay()} disabled={state.days.length >= 7}>
            <span className="hidden sm:inline">Giorno</span>
            <span className="sr-only sm:hidden">Aggiungi giorno</span>
          </Button>
        </div>
        {errors.days && (
          <p role="alert" className="text-sm font-medium text-danger">
            {errors.days}
          </p>
        )}

        {!day ? (
          <EmptyState icon="plans" title="Nessun giorno" action={<Button variant="primary" icon="plus" onClick={() => addDay()}>Aggiungi il primo giorno</Button>}>
            Organizza la scheda in giorni (es. Giorno A, B, C oppure Push, Pull, Gambe).
          </EmptyState>
        ) : (
          <section role="tabpanel" aria-label={day.name} className="flex flex-col gap-3">
            <div className="flex items-end gap-2">
              <Field label="Nome del giorno" htmlFor="day-name" error={errors[`days.${dayIndex}.name`]} className="flex-1">
                <input
                  id="day-name"
                  className={inputClass}
                  maxLength={40}
                  list="day-name-presets"
                  value={day.name}
                  onChange={(e) => updateDay(day.uid, (d) => ({ ...d, name: e.target.value }))}
                />
              </Field>
              <datalist id="day-name-presets">
                {DAY_NAME_PRESETS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
              <IconButton icon="trash" label={`Elimina ${day.name}`} className="mb-0.5 border border-line text-danger" onClick={() => removeDay(day.uid)} />
            </div>

            {day.items.length === 0 ? (
              <EmptyState icon="dumbbell" title="Nessun esercizio">
                Aggiungi gli esercizi per questo giorno: potrai riordinarli trascinandoli.
              </EmptyState>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onItemsDragEnd}>
                <SortableContext items={day.items.map((i) => i.uid)} strategy={verticalListSortingStrategy}>
                  <ol className="flex flex-col gap-2" aria-label={`Esercizi di ${day.name}`}>
                    {day.items.map((item, i) => (
                      <BuilderItemCard
                        key={item.uid}
                        item={item}
                        index={i}
                        exercise={bySlug.get(item.exerciseSlug)}
                        errors={itemErrors(dayIndex, i)}
                        otherDays={state.days.filter((d) => d.uid !== day.uid)}
                        onChange={(patch) => updateItem(day.uid, item.uid, patch)}
                        onRemove={() => updateDay(day.uid, (d) => ({ ...d, items: d.items.filter((x) => x.uid !== item.uid) }))}
                        onDuplicate={() =>
                          updateDay(day.uid, (d) => {
                            const copy = { ...item, uid: uid("item") };
                            const items = [...d.items];
                            items.splice(i + 1, 0, copy);
                            return { ...d, items };
                          })
                        }
                        onMove={(target) =>
                          setState((s) => ({
                            ...s,
                            days: s.days.map((d) =>
                              d.uid === day.uid
                                ? { ...d, items: d.items.filter((x) => x.uid !== item.uid) }
                                : d.uid === target
                                  ? { ...d, items: [...d.items, item] }
                                  : d,
                            ),
                          }))
                        }
                      />
                    ))}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
            <Button size="lg" icon="plus" className="border-dashed" onClick={() => setPickerOpen(true)}>
              Aggiungi esercizio
            </Button>
          </section>
        )}

        <div className="pb-safe sticky bottom-16 z-20 -mx-4 mt-2 flex flex-col gap-2 border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur lg:bottom-0 lg:mx-0 lg:rounded-2xl lg:border lg:px-3">
          {formError && (
            <p role="alert" className="flex items-center gap-2 text-sm font-semibold text-danger">
              <Icon name="alert" size={18} /> {formError}
            </p>
          )}
          <div className="flex gap-2">
            <Button size="lg" variant="ghost" onClick={() => router.push(cancelHref)}>
              Annulla
            </Button>
            <Button size="lg" variant="primary" icon="check" className="flex-1" onClick={save} disabled={saving}>
              {saving ? "Salvataggio…" : "Salva scheda"}
            </Button>
          </div>
        </div>
      </div>

      <ExercisePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        exercises={exercises}
        title={day ? `Aggiungi a ${day.name}` : "Aggiungi esercizi"}
        onPick={(e) => day && updateDay(day.uid, (d) => ({ ...d, items: [...d.items, newItem(e.slug, e.type)] }))}
      />
    </div>
  );
}

function DayTab({ day, active, errorCount, onSelect }: { day: BuilderDay; active: boolean; errorCount: number; onSelect: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: day.uid });
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), transition }} className={cx(isDragging && "z-10")}>
      <button
        type="button"
        {...attributes}
        {...listeners}
        role="tab"
        aria-selected={active}
        onClick={onSelect}
        aria-roledescription="giorno trascinabile"
        className={cx(
          "flex h-12 touch-manipulation items-center gap-2 rounded-xl border px-4 font-semibold whitespace-nowrap",
          active ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:bg-surface-2",
          isDragging && "shadow-lg",
          errorCount > 0 && !active && "border-danger text-danger",
        )}
      >
        {day.name || "Senza nome"}
        <span className={cx("text-xs tabular-nums", active ? "opacity-70" : "text-muted")}>{day.items.length}</span>
      </button>
    </li>
  );
}
