"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useState } from "react";
import { MUSCLE_LABELS } from "@/lib/domain";
import type { ExerciseSummary } from "@/lib/exercise";
import { useSettings } from "../settings";
import { ExerciseImage } from "../exercise-image";
import { Icon } from "../icon";
import { Badge, cx, IconButton, inputClass, Select } from "../ui";
import { formatReps, formatRest, REST_PRESETS, type BuilderItem } from "./state";

const small = cx(inputClass, "h-11 px-2.5 text-center");

export function BuilderItemCard({
  item,
  index,
  exercise,
  errors,
  otherDays,
  onChange,
  onRemove,
  onDuplicate,
  onMove,
}: {
  item: BuilderItem;
  index: number;
  exercise: ExerciseSummary | undefined;
  errors: Record<string, string>;
  otherDays: { uid: string; name: string }[];
  onChange: (patch: Partial<BuilderItem>) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onMove: (dayUid: string) => void;
}) {
  const { unit } = useSettings();
  const hasErrors = Object.keys(errors).length > 0;
  const [open, setOpen] = useState(hasErrors);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({
    id: item.uid,
  });
  const id = (f: string) => `${item.uid}-${f}`;
  const err = (f: string) => errors[f];
  const name = exercise?.name ?? item.exerciseSlug;
  const expanded = open || hasErrors;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cx(
        "rounded-2xl border bg-surface",
        isDragging ? "relative z-10 border-accent shadow-xl" : hasErrors ? "border-danger" : "border-line",
      )}
    >
      <div className="flex items-center gap-1 p-2">
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-xl text-muted hover:bg-surface-2 active:cursor-grabbing"
          aria-label={`Trascina per riordinare ${name}`}
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" />
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-xl p-1 text-left"
          aria-expanded={expanded}
          aria-controls={id("details")}
          onClick={() => setOpen((o) => !o)}
        >
          <ExerciseImage
            src={exercise?.image}
            alt=""
            primary={exercise?.primaryMuscle ?? "core"}
            className="size-12 shrink-0 rounded-lg"
            sizes="48px"
          />
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="text-sm font-bold text-muted tabular-nums">{index + 1}.</span>
              <span className="truncate font-bold">{name}</span>
            </span>
            <span className="block truncate text-sm text-muted">
              {item.sets} × {formatReps(item.repsMin, item.repsMax)}
              {item.loadText && ` · ${item.loadText} ${unit}`} · rec. {formatRest(item.restSeconds)}
              {exercise && ` · ${MUSCLE_LABELS[exercise.primaryMuscle]}`}
            </span>
          </span>
          {item.superset && <Badge tone="accent">SS {item.superset}</Badge>}
          <Icon name="chevron" size={18} className={cx("shrink-0 text-muted transition", expanded && "rotate-90")} />
        </button>
      </div>

      {expanded && (
        <div id={id("details")} className="grid grid-cols-3 gap-3 border-t border-line p-3 sm:grid-cols-6">
          <NumField label="Serie" id={id("sets")} value={item.sets} min={1} max={20} error={err("sets")} onChange={(v) => onChange({ sets: v })} />
          <NumField label="Rip. min" id={id("repsMin")} value={item.repsMin} min={1} max={100} error={err("repsMin")} onChange={(v) => onChange({ repsMin: v, repsMax: Math.max(v, item.repsMax) })} />
          <NumField label="Rip. max" id={id("repsMax")} value={item.repsMax} min={1} max={100} error={err("repsMax")} onChange={(v) => onChange({ repsMax: v })} />
          <div className="flex flex-col gap-1">
            <label htmlFor={id("load")} className="text-xs font-semibold text-muted">
              Carico ({unit})
            </label>
            <input
              id={id("load")}
              inputMode="decimal"
              placeholder="—"
              className={small}
              value={item.loadText}
              aria-invalid={!!err("load")}
              onChange={(e) => onChange({ loadText: e.target.value.replace(/[^0-9.,]/g, "") })}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={id("rest")} className="text-xs font-semibold text-muted">
              Recupero
            </label>
            <Select id={id("rest")} value={item.restSeconds} onChange={(e) => onChange({ restSeconds: Number(e.target.value) })}>
              {[...new Set([...REST_PRESETS, item.restSeconds])].sort((a, b) => a - b).map((s) => (
                <option key={s} value={s}>
                  {formatRest(s)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={id("tempo")} className="text-xs font-semibold text-muted">
              Tempo
            </label>
            <input
              id={id("tempo")}
              placeholder="3-1-1-0"
              className={small}
              value={item.tempo ?? ""}
              aria-invalid={!!err("tempo")}
              onChange={(e) => onChange({ tempo: e.target.value })}
            />
          </div>
          {(err("tempo") || err("repsMax") || err("sets") || err("repsMin")) && (
            <p role="alert" className="col-span-full text-sm font-medium text-danger">
              {err("sets") ?? err("repsMin") ?? err("repsMax") ?? err("tempo")}
            </p>
          )}
          <div className="flex flex-col gap-1">
            <label htmlFor={id("superset")} className="text-xs font-semibold text-muted">
              Superset
            </label>
            <Select id={id("superset")} value={item.superset ?? ""} onChange={(e) => onChange({ superset: e.target.value || null })}>
              <option value="">No</option>
              {"ABCDEF".split("").map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1 sm:col-span-5">
            <label htmlFor={id("notes")} className="text-xs font-semibold text-muted">
              Note
            </label>
            <input
              id={id("notes")}
              className={cx(inputClass, "h-11")}
              placeholder="Es. fermo di 1″ in basso, presa neutra…"
              maxLength={300}
              value={item.notes ?? ""}
              onChange={(e) => onChange({ notes: e.target.value })}
            />
          </div>
          <div className="col-span-full flex flex-wrap items-center gap-2 pt-1">
            {otherDays.length > 0 && (
              <Select
                aria-label="Sposta in un altro giorno"
                className="min-w-44 flex-1 sm:flex-none"
                value=""
                onChange={(e) => e.target.value && onMove(e.target.value)}
              >
                <option value="">Sposta in…</option>
                {otherDays.map((d) => (
                  <option key={d.uid} value={d.uid}>
                    {d.name || "Giorno senza nome"}
                  </option>
                ))}
              </Select>
            )}
            <div className="ml-auto flex">
              <IconButton icon="copy" label="Duplica esercizio" onClick={onDuplicate} />
              <IconButton icon="trash" label={`Rimuovi ${name}`} className="text-danger" onClick={onRemove} />
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

function NumField({
  label,
  id,
  value,
  min,
  max,
  error,
  onChange,
}: {
  label: string;
  id: string;
  value: number;
  min: number;
  max: number;
  error?: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-semibold text-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        className={small}
        value={Number.isFinite(value) ? value : ""}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value === "" ? NaN : Math.round(Number(e.target.value)))}
      />
    </div>
  );
}
