"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EQUIPMENT, EQUIPMENT_LABELS, MUSCLE_GROUPS, MUSCLE_LABELS, type Equipment, type MuscleGroup } from "@/lib/domain";
import { filterExercises, type ExerciseSummary } from "@/lib/exercise";
import { ExerciseImage } from "./exercise-image";
import { Icon } from "./icon";
import { Badge, Button, cx, IconButton, inputClass, Select } from "./ui";

/**
 * Selettore esercizi a schermo intero (mobile) o modale (desktop).
 * Resta aperto dopo ogni scelta, così si possono aggiungere più esercizi di fila.
 */
export function ExercisePicker({
  open,
  onClose,
  exercises,
  onPick,
  title = "Aggiungi esercizi",
}: {
  open: boolean;
  onClose: () => void;
  exercises: ExerciseSummary[];
  onPick: (exercise: ExerciseSummary) => void;
  title?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [q, setQ] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | "">("");
  const [equipment, setEquipment] = useState<Equipment | "">("");
  const [added, setAdded] = useState<string[]>([]);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setAdded([]);
    } else if (!open && d.open) d.close();
  }, [open]);

  const results = useMemo(
    () => filterExercises(exercises, { q, muscle, equipment }).sort((a, b) => Number(b.favorite) - Number(a.favorite)),
    [exercises, q, muscle, equipment],
  );

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="picker-title"
      className="m-0 h-dvh max-h-none w-full max-w-none bg-bg p-0 text-ink backdrop:bg-black/50 md:m-auto md:h-[85dvh] md:max-w-2xl md:rounded-3xl md:border md:border-line"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <h2 id="picker-title" className="flex-1 text-lg font-extrabold">
            {title}
          </h2>
          {added.length > 0 && <Badge tone="ok">{added.length} aggiunti</Badge>}
          <IconButton icon="close" label="Chiudi" onClick={onClose} />
        </div>
        <div className="flex flex-col gap-2 border-b border-line px-4 py-3">
          <div className="relative">
            <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              aria-label="Cerca esercizio"
              placeholder="Cerca esercizio…"
              className={cx(inputClass, "pl-11")}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select aria-label="Gruppo muscolare" value={muscle} onChange={(e) => setMuscle(e.target.value as MuscleGroup | "")}>
              <option value="">Tutti i muscoli</option>
              {MUSCLE_GROUPS.map((m) => (
                <option key={m} value={m}>
                  {MUSCLE_LABELS[m]}
                </option>
              ))}
            </Select>
            <Select aria-label="Attrezzo" value={equipment} onChange={(e) => setEquipment(e.target.value as Equipment | "")}>
              <option value="">Tutti gli attrezzi</option>
              {EQUIPMENT.map((m) => (
                <option key={m} value={m}>
                  {EQUIPMENT_LABELS[m]}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <ul className="flex-1 overflow-y-auto px-2 py-2" aria-label="Risultati">
          {results.map((e) => {
            const count = added.filter((s) => s === e.slug).length;
            return (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => {
                    onPick(e);
                    setAdded((a) => [...a, e.slug]);
                  }}
                  className="flex w-full items-center gap-3 rounded-xl p-2 text-left hover:bg-surface-2"
                >
                  <ExerciseImage
                    src={e.image}
                    alt=""
                    primary={e.primaryMuscle}
                    className="size-14 shrink-0 rounded-lg"
                    sizes="56px"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{e.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {MUSCLE_LABELS[e.primaryMuscle]} · {EQUIPMENT_LABELS[e.equipment]}
                    </span>
                  </span>
                  {e.favorite && <Icon name="star" size={16} filled className="text-accent" />}
                  <span
                    className={cx(
                      "flex size-9 shrink-0 items-center justify-center rounded-full",
                      count > 0 ? "bg-ok text-white" : "bg-surface-2 text-ink",
                    )}
                    aria-hidden="true"
                  >
                    <Icon name={count > 0 ? "check" : "plus"} size={18} />
                  </span>
                  <span className="sr-only">{count > 0 ? `aggiunto ${count} volte` : "aggiungi"}</span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && <li className="p-6 text-center text-muted">Nessun esercizio trovato.</li>}
        </ul>
        <div className="pb-safe border-t border-line px-4 pt-3">
          <Button variant="primary" size="lg" className="w-full" onClick={onClose}>
            Fatto
          </Button>
        </div>
      </div>
    </dialog>
  );
}
