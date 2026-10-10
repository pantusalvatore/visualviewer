"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import {
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISE_TYPES,
  LEVELS,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  TYPE_LABELS,
  isOneOf,
} from "@/lib/domain";
import { filterExercises, type ExerciseFilters, type ExerciseSummary } from "@/lib/exercise";
import { ExerciseImage } from "./exercise-image";
import { Icon } from "./icon";
import { Badge, Button, cx, inputClass, Select } from "./ui";

function readFilters(params: URLSearchParams): ExerciseFilters {
  const muscle = params.get("muscolo");
  const equipment = params.get("attrezzo");
  const level = params.get("livello");
  const type = params.get("tipo");
  return {
    q: params.get("q") ?? "",
    muscle: isOneOf(MUSCLE_GROUPS, muscle) ? muscle : "",
    equipment: isOneOf(EQUIPMENT, equipment) ? equipment : "",
    level: isOneOf(LEVELS, level) ? level : "",
    type: isOneOf(EXERCISE_TYPES, type) ? type : "",
    favorites: params.get("preferiti") === "1",
  };
}

export function ExerciseLibrary({ exercises }: { exercises: ExerciseSummary[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [filters, setFilters] = useState<ExerciseFilters>(() => readFilters(new URLSearchParams(params.toString())));
  const [showFilters, setShowFilters] = useState(false);
  const deferred = useDeferredValue(filters);
  const results = useMemo(() => filterExercises(exercises, deferred), [exercises, deferred]);

  /** Aggiorna stato e URL (così i filtri sopravvivono al "indietro" del browser). */
  function update(patch: Partial<ExerciseFilters>) {
    const next = { ...filters, ...patch };
    setFilters(next);
    const sp = new URLSearchParams();
    if (next.q) sp.set("q", next.q);
    if (next.muscle) sp.set("muscolo", next.muscle);
    if (next.equipment) sp.set("attrezzo", next.equipment);
    if (next.level) sp.set("livello", next.level);
    if (next.type) sp.set("tipo", next.type);
    if (next.favorites) sp.set("preferiti", "1");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  const activeCount = [filters.equipment, filters.level, filters.type].filter(Boolean).length;

  const sidebar = (
    <div className="flex flex-col gap-4">
      <Select aria-label="Attrezzo" value={filters.equipment} onChange={(e) => update({ equipment: e.target.value as ExerciseFilters["equipment"] })}>
        <option value="">Tutti gli attrezzi</option>
        {EQUIPMENT.map((eq) => (
          <option key={eq} value={eq}>
            {EQUIPMENT_LABELS[eq]}
          </option>
        ))}
      </Select>
      <Select aria-label="Livello" value={filters.level} onChange={(e) => update({ level: e.target.value as ExerciseFilters["level"] })}>
        <option value="">Tutti i livelli</option>
        {LEVELS.map((l) => (
          <option key={l} value={l}>
            {LEVEL_LABELS[l]}
          </option>
        ))}
      </Select>
      <Select aria-label="Tipo" value={filters.type} onChange={(e) => update({ type: e.target.value as ExerciseFilters["type"] })}>
        <option value="">Tutti i tipi</option>
        {EXERCISE_TYPES.map((t) => (
          <option key={t} value={t}>
            {TYPE_LABELS[t]}
          </option>
        ))}
      </Select>
      <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-line bg-surface px-3.5 font-semibold">
        <input
          type="checkbox"
          className="size-5 accent-[var(--c-accent)]"
          checked={!!filters.favorites}
          onChange={(e) => update({ favorites: e.target.checked })}
        />
        Solo preferiti
      </label>
      {(activeCount > 0 || filters.favorites || filters.muscle || filters.q) && (
        <Button variant="ghost" onClick={() => update({ q: "", muscle: "", equipment: "", level: "", type: "", favorites: false })}>
          Azzera filtri
        </Button>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Icon name="search" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input
            type="search"
            inputMode="search"
            aria-label="Cerca esercizi"
            placeholder="Cerca per nome, muscolo, attrezzo…"
            className={cx(inputClass, "pl-11")}
            value={filters.q}
            onChange={(e) => update({ q: e.target.value })}
          />
        </div>
        <Button
          className="lg:hidden"
          icon="filter"
          aria-expanded={showFilters}
          aria-controls="filtri-esercizi"
          onClick={() => setShowFilters((v) => !v)}
        >
          <span className="sr-only sm:not-sr-only">Filtri</span>
          {activeCount > 0 && <Badge tone="accent">{activeCount}</Badge>}
        </Button>
      </div>

      <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0" role="group" aria-label="Gruppo muscolare">
        <div className="flex w-max gap-2 md:w-auto md:flex-wrap">
          {[{ value: "", label: "Tutti" }, ...MUSCLE_GROUPS.map((m) => ({ value: m, label: MUSCLE_LABELS[m] }))].map((o) => {
            const active = (filters.muscle ?? "") === o.value;
            return (
              <button
                key={o.value || "tutti"}
                type="button"
                aria-pressed={active}
                onClick={() => update({ muscle: o.value as ExerciseFilters["muscle"] })}
                className={cx(
                  "h-10 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition",
                  active ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:bg-surface-2",
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside id="filtri-esercizi" className={cx(showFilters ? "block" : "hidden", "lg:block")} aria-label="Filtri">
          <div className="lg:sticky lg:top-8">{sidebar}</div>
        </aside>

        <section aria-live="polite" aria-label="Risultati">
          <p className="mb-3 text-sm text-muted">
            {results.length} {results.length === 1 ? "esercizio" : "esercizi"}
          </p>
          {results.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">
              Nessun esercizio trovato con questi filtri.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {results.map((e) => (
                <li key={e.id}>
                  <ExerciseCard exercise={e} />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

export function ExerciseCard({ exercise: e }: { exercise: ExerciseSummary }) {
  return (
    <Link
      href={`/esercizi/${e.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface transition hover:border-ink/30"
    >
      <ExerciseImage
        src={e.image}
        alt=""
        primary={e.primaryMuscle}
        secondary={e.secondaryMuscles}
        className="aspect-[4/3]"
        sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 50vw"
      />
      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <p className="eyebrow !text-[0.625rem] text-accent">{MUSCLE_LABELS[e.primaryMuscle]}</p>
        <h3 className="leading-snug font-bold">{e.name}</h3>
        <p className="mt-auto flex items-center gap-1.5 pt-1 text-xs text-muted">
          {EQUIPMENT_LABELS[e.equipment]} · {LEVEL_LABELS[e.level]}
          {e.favorite && <Icon name="star" size={14} filled className="ml-auto text-accent" aria-label="Preferito" />}
          {e.isCustom && <Badge className="ml-auto">Mio</Badge>}
        </p>
      </div>
    </Link>
  );
}
