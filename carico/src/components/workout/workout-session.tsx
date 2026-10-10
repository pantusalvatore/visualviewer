"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { saveWorkout } from "@/lib/actions/workouts";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/domain";
import { formatDuration, suggestNextLoad } from "@/lib/progression";
import { formatWeight, parseWeightInput, type WeightUnit } from "@/lib/units";
import { formatReps, formatRest } from "../builder/state";
import { ExerciseImage } from "../exercise-image";
import { Icon } from "../icon";
import { useSettings } from "../settings";
import { Badge, Button, cx, IconButton, textareaClass } from "../ui";
import { RestTimer, unlockAudio } from "./rest-timer";

export interface WorkoutItemInput {
  itemId: string;
  exerciseId: string;
  slug: string;
  name: string;
  image: string | null;
  primaryMuscle: MuscleGroup;
  sets: number;
  repsMin: number;
  repsMax: number;
  load: number | null;
  restSeconds: number;
  tempo: string | null;
  notes: string | null;
  superset: string | null;
  last: { date: string; sets: { setNumber: number; weight: number; reps: number }[] } | null;
}

interface WSet {
  weight: string;
  reps: string;
  done: boolean;
}
interface WState {
  version: 1;
  startedAt: string;
  current: number;
  sets: WSet[][];
  notes: string;
  rest: { endAt: number; total: number } | null;
}

/** Orario di fine del recupero (fuori dal componente: viene chiamato solo dagli handler). */
function restEndsAt(seconds: number): number {
  return Date.now() + seconds * 1000;
}

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });

function initialSets(item: WorkoutItemInput, unit: WeightUnit): WSet[] {
  const suggestion = item.last
    ? suggestNextLoad(item.last.sets, { sets: item.sets, repsMin: item.repsMin, repsMax: item.repsMax })
    : null;
  return Array.from({ length: item.sets }, (_, i) => {
    const prev = item.last?.sets[i] ?? item.last?.sets.at(-1);
    const kg = suggestion?.weight ?? prev?.weight ?? item.load ?? null;
    const reps = prev?.reps ?? item.repsMax;
    return { weight: kg !== null ? formatWeight(kg, unit, false) : "", reps: String(reps), done: false };
  });
}

/** Il recupero si salta tra esercizi dello stesso superset, finché non si chiude il giro. */
function isSupersetLink(items: WorkoutItemInput[], index: number): boolean {
  const cur = items[index];
  const next = items[index + 1];
  return !!cur?.superset && cur.superset === next?.superset;
}

export function WorkoutSession(props: {
  planId: string;
  planName: string;
  dayId: string;
  dayName: string;
  items: WorkoutItemInput[];
}) {
  const { ready } = useSettings();
  if (!ready) return <div className="h-96 animate-pulse rounded-2xl bg-surface-2" aria-busy="true" aria-label="Caricamento" />;
  return <WorkoutSessionInner {...props} />;
}

function WorkoutSessionInner({
  planId,
  planName,
  dayId,
  dayName,
  items,
}: {
  planId: string;
  planName: string;
  dayId: string;
  dayName: string;
  items: WorkoutItemInput[];
}) {
  const router = useRouter();
  const { unit } = useSettings();
  const storageKey = `carico:allenamento:${dayId}`;
  const fresh = useCallback(
    (): WState => ({
      version: 1,
      startedAt: new Date().toISOString(),
      current: 0,
      sets: items.map((i) => initialSets(i, unit)),
      notes: "",
      rest: null,
    }),
    [items, unit],
  );

  const [state, setState] = useState<WState>(() => {
    // Ripristina un allenamento interrotto (es. pagina ricaricata in palestra).
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null") as WState | null;
      const age = saved ? Date.now() - new Date(saved.startedAt).getTime() : Infinity;
      if (saved?.version === 1 && saved.sets.length === items.length && age < 12 * 3600 * 1000) return saved;
    } catch {}
    return fresh();
  });
  const [now, setNow] = useState(() => Date.now());
  const [finishing, setFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const cardRef = useRef<HTMLDivElement>(null);

  // Salvataggio locale continuo: nessun dato perso se la connessione cade.
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {}
  }, [state, storageKey]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);

  // Schermo sempre acceso durante l'allenamento, dove supportato.
  useEffect(() => {
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        lock = (await navigator.wakeLock?.request("screen")) ?? null;
      } catch {}
    };
    void request();
    const onVisible = () => document.visibilityState === "visible" && void request();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      void lock?.release().catch(() => {});
    };
  }, []);

  const item = items[state.current];
  const sets = state.sets[state.current] ?? [];
  const doneCount = state.sets.flat().filter((s) => s.done).length;
  const totalCount = state.sets.flat().length;

  const setRest = useCallback(
    (endAt: number | null, total?: number) =>
      setState((s) => ({ ...s, rest: endAt === null ? null : { endAt, total: total ?? s.rest?.total ?? 0 } })),
    [],
  );

  function goTo(index: number) {
    setState((s) => ({ ...s, current: Math.max(0, Math.min(items.length - 1, index)) }));
    cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function updateSet(setIndex: number, patch: Partial<WSet>) {
    setState((s) => ({
      ...s,
      sets: s.sets.map((list, i) => (i === s.current ? list.map((x, j) => (j === setIndex ? { ...x, ...patch } : x)) : list)),
    }));
  }

  function toggleDone(setIndex: number) {
    unlockAudio();
    const wasDone = sets[setIndex]?.done;
    updateSet(setIndex, { done: !wasDone });
    if (wasDone || !item) return;
    navigator.vibrate?.(30);
    const remaining = sets.filter((x, j) => j !== setIndex && !x.done).length;
    const linked = isSupersetLink(items, state.current);
    if (linked) {
      // Superset: passa subito all'esercizio successivo del gruppo.
      setTimeout(() => goTo(state.current + 1), 350);
      return;
    }
    // Fine di un giro di superset: torna al primo esercizio del gruppo se restano serie.
    let target = state.current;
    if (item.superset) {
      while (target > 0 && items[target - 1]?.superset === item.superset) target--;
    }
    const groupHasSetsLeft = state.sets.some((list, i) => {
      if (i < target || i > state.current) return false;
      return list.some((x, j) => !x.done && !(i === state.current && j === setIndex));
    });
    if (item.restSeconds > 0 && (remaining > 0 || groupHasSetsLeft || state.current < items.length - 1)) {
      setRest(restEndsAt(item.restSeconds), item.restSeconds);
    }
    if (target !== state.current && groupHasSetsLeft) setTimeout(() => goTo(target), 350);
    else if (remaining === 0 && state.current < items.length - 1) setTimeout(() => goTo(state.current + 1), 600);
  }

  function addSet() {
    setState((s) => ({
      ...s,
      sets: s.sets.map((list, i) => {
        if (i !== s.current) return list;
        const last = list.at(-1);
        return [...list, { weight: last?.weight ?? "", reps: last?.reps ?? "", done: false }];
      }),
    }));
  }

  function removeSet() {
    setState((s) => ({
      ...s,
      sets: s.sets.map((list, i) => (i === s.current && list.length > 1 ? list.slice(0, -1) : list)),
    }));
  }

  function finish() {
    setError(null);
    const payloadSets = state.sets.flatMap((list, position) =>
      list
        .map((x, j) => ({ x, setNumber: j + 1 }))
        .filter(({ x }) => x.done)
        .map(({ x, setNumber }) => ({
          exerciseId: items[position]!.exerciseId,
          position,
          setNumber,
          weight: parseWeightInput(x.weight, unit) ?? 0,
          reps: Math.max(0, Math.round(Number(x.reps) || 0)),
        })),
    );
    startSaving(async () => {
      try {
        const res = await saveWorkout({
          planId,
          dayId,
          planName,
          dayName,
          startedAt: state.startedAt,
          finishedAt: new Date().toISOString(),
          notes: state.notes.trim() || null,
          sets: payloadSets,
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        localStorage.removeItem(storageKey);
        router.push(`/storico/${res.data.id}?nuovo=1`);
      } catch {
        setError("Connessione assente: l'allenamento è conservato su questo dispositivo. Riprova quando sei online.");
      }
    });
  }

  const suggestion = useMemo(() => {
    if (!item?.last) return null;
    return suggestNextLoad(item.last.sets, { sets: item.sets, repsMin: item.repsMin, repsMax: item.repsMax });
  }, [item]);

  if (!item) {
    return <p className="text-muted">Questo giorno non contiene esercizi.</p>;
  }

  return (
    <div className={cx("flex flex-col gap-4", state.rest ? "pb-40" : "pb-8")}>
      {/* Barra superiore */}
      <div className="sticky top-0 z-30 -mx-4 flex items-center gap-2 border-b border-line bg-bg/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        <IconButton
          icon="close"
          label="Esci dall'allenamento"
          onClick={() => {
            if (doneCount === 0 || confirm("Uscire? I progressi restano salvati su questo dispositivo e potrai riprendere.")) {
              router.push(`/schede/${planId}`);
            }
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate font-extrabold">{dayName}</p>
          <p className="text-xs text-muted tabular-nums">
            {formatDuration(now - new Date(state.startedAt).getTime())} · {doneCount}/{totalCount} serie
          </p>
        </div>
        <Button variant="primary" onClick={() => {
            setNow(Date.now());
            setFinishing(true);
          }} disabled={doneCount === 0}>
          Termina
        </Button>
      </div>
      <div className="-mt-4 -mx-4 h-1 bg-surface-2 md:-mx-8" aria-hidden="true">
        <div className="h-full bg-accent transition-all" style={{ width: `${(doneCount / Math.max(1, totalCount)) * 100}%` }} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)] lg:items-start">
        {/* Elenco esercizi */}
        <nav aria-label="Esercizi dell'allenamento" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:overflow-visible lg:px-0">
          <ol className="flex gap-2 lg:sticky lg:top-20 lg:flex-col">
            {items.map((it, i) => {
              const list = state.sets[i] ?? [];
              const complete = list.length > 0 && list.every((x) => x.done);
              const active = i === state.current;
              return (
                <li key={it.itemId} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => goTo(i)}
                    aria-current={active ? "step" : undefined}
                    className={cx(
                      "flex h-12 w-full items-center gap-2 rounded-xl border px-3 text-left text-sm font-semibold lg:h-auto lg:py-2.5",
                      active ? "border-ink bg-ink text-bg" : complete ? "border-ok/40 bg-ok-soft text-ok" : "border-line bg-surface",
                    )}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-current/15 text-xs tabular-nums">
                      {complete ? <Icon name="check" size={14} /> : i + 1}
                    </span>
                    <span className="max-w-40 truncate lg:max-w-none">{it.name}</span>
                    {it.superset && <span className="ml-auto text-xs opacity-70">SS {it.superset}</span>}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        {/* Esercizio corrente */}
        <div ref={cardRef} className="flex scroll-mt-20 flex-col gap-4">
          <div className="flex gap-4 overflow-hidden rounded-2xl border border-line bg-surface p-3">
            <ExerciseImage src={item.image} alt="" primary={item.primaryMuscle} className="size-24 shrink-0 rounded-xl sm:size-32" sizes="128px" priority />
            <div className="min-w-0 flex-1">
              <p className="eyebrow text-accent">
                {state.current + 1}/{items.length} · {MUSCLE_LABELS[item.primaryMuscle]}
              </p>
              <h1 className="text-xl leading-tight font-extrabold sm:text-2xl">{item.name}</h1>
              <p className="mt-1 font-semibold tabular-nums">
                {item.sets} × {formatReps(item.repsMin, item.repsMax)} · rec. {formatRest(item.restSeconds)}
                {item.tempo && ` · ${item.tempo}`}
              </p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {item.superset && <Badge tone="accent">Superset {item.superset}</Badge>}
                <Link href={`/esercizi/${item.slug}`} target="_blank" className="text-sm font-semibold text-accent underline-offset-2 hover:underline">
                  Come si esegue
                </Link>
              </div>
            </div>
          </div>

          {item.notes && (
            <p className="flex gap-2 rounded-xl bg-surface-2 p-3 text-sm">
              <Icon name="info" size={18} className="shrink-0 text-muted" /> {item.notes}
            </p>
          )}

          {item.last && (
            <div className="rounded-xl border border-line p-3 text-sm">
              <p className="eyebrow mb-1">Ultima volta · {dateFmt.format(new Date(item.last.date))}</p>
              <p className="font-semibold tabular-nums">
                {item.last.sets.map((x) => `${formatWeight(x.weight, unit, false)}×${x.reps}`).join("  ·  ")}{" "}
                <span className="font-normal text-muted">{unit}</span>
              </p>
              {suggestion && (
                <p className="mt-1 text-muted">
                  Suggerito oggi:{" "}
                  <strong className={suggestion.reason === "aumenta" ? "text-ok" : "text-ink"}>
                    {formatWeight(suggestion.weight, unit)}
                  </strong>
                  {suggestion.reason === "aumenta" && " (hai chiuso tutte le ripetizioni: aumenta!)"}
                  {suggestion.reason === "riduci" && " (riduci un po' per restare nel range)"}
                </p>
              )}
            </div>
          )}

          {/* Serie */}
          <div className="overflow-hidden rounded-2xl border border-line bg-surface">
            <div className="grid grid-cols-[2.5rem_1fr_1fr_4rem] items-center gap-2 border-b border-line px-3 py-2 text-xs font-bold tracking-wider text-muted uppercase">
              <span>Serie</span>
              <span className="text-center">Peso ({unit})</span>
              <span className="text-center">Rip.</span>
              <span className="sr-only">Completata</span>
            </div>
            <ol>
              {sets.map((s, j) => (
                <li
                  key={j}
                  className={cx(
                    "grid grid-cols-[2.5rem_1fr_1fr_4rem] items-center gap-2 border-b border-line px-3 py-2 last:border-b-0",
                    s.done && "bg-ok-soft",
                  )}
                >
                  <span className="text-center text-lg font-black tabular-nums">{j + 1}</span>
                  <input
                    aria-label={`Peso serie ${j + 1} in ${unit}`}
                    inputMode="decimal"
                    className="h-14 w-full rounded-xl border border-line bg-bg text-center text-xl font-bold tabular-nums focus:border-accent focus:outline-none"
                    value={s.weight}
                    placeholder="0"
                    onChange={(e) => updateSet(j, { weight: e.target.value.replace(/[^0-9.,]/g, "") })}
                    onFocus={(e) => e.target.select()}
                  />
                  <input
                    aria-label={`Ripetizioni serie ${j + 1}`}
                    inputMode="numeric"
                    className="h-14 w-full rounded-xl border border-line bg-bg text-center text-xl font-bold tabular-nums focus:border-accent focus:outline-none"
                    value={s.reps}
                    placeholder={String(item.repsMax)}
                    onChange={(e) => updateSet(j, { reps: e.target.value.replace(/[^0-9]/g, "") })}
                    onFocus={(e) => e.target.select()}
                  />
                  <button
                    type="button"
                    aria-pressed={s.done}
                    aria-label={s.done ? `Serie ${j + 1} completata, tocca per annullare` : `Completa serie ${j + 1}`}
                    onClick={() => toggleDone(j)}
                    className={cx(
                      "flex h-14 w-full items-center justify-center rounded-xl border-2 transition",
                      s.done ? "border-ok bg-ok text-white" : "border-line text-muted hover:border-ok hover:text-ok",
                    )}
                  >
                    <Icon name="check" size={28} />
                  </button>
                </li>
              ))}
            </ol>
            <div className="flex border-t border-line">
              <button type="button" onClick={addSet} className="flex h-12 flex-1 items-center justify-center gap-2 text-sm font-semibold hover:bg-surface-2">
                <Icon name="plus" size={18} /> Aggiungi serie
              </button>
              <button
                type="button"
                onClick={removeSet}
                disabled={sets.length <= 1}
                className="flex h-12 flex-1 items-center justify-center gap-2 border-l border-line text-sm font-semibold hover:bg-surface-2 disabled:opacity-40"
              >
                <Icon name="minus" size={18} /> Togli serie
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            <Button size="lg" icon="back" className="flex-1" disabled={state.current === 0} onClick={() => goTo(state.current - 1)}>
              Precedente
            </Button>
            {state.current < items.length - 1 ? (
              <Button size="lg" className="flex-1" onClick={() => goTo(state.current + 1)}>
                Successivo <Icon name="chevron" size={20} />
              </Button>
            ) : (
              <Button size="lg" variant="primary" icon="check" className="flex-1" disabled={doneCount === 0} onClick={() => {
                setNow(Date.now());
                setFinishing(true);
              }}>
                Termina
              </Button>
            )}
          </div>
          <button
            type="button"
            className="self-start text-sm text-muted underline underline-offset-2"
            onClick={() => {
              if (confirm("Ricominciare da capo? Le serie segnate andranno perse.")) setState(fresh());
            }}
          >
            Ricomincia l&apos;allenamento
          </button>
        </div>
      </div>

      {state.rest && <RestTimer endAt={state.rest.endAt} total={state.rest.total} onChange={setRest} />}

      {finishing && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 md:items-center" role="dialog" aria-modal="true" aria-labelledby="fine-titolo">
          <div className="pb-safe w-full max-w-lg rounded-t-3xl bg-bg p-5 md:rounded-3xl">
            <h2 id="fine-titolo" className="text-2xl font-extrabold">
              Termina allenamento
            </h2>
            <p className="mt-1 text-muted">
              {doneCount} serie completate su {totalCount} · {formatDuration(now - new Date(state.startedAt).getTime())}
            </p>
            <label htmlFor="note-allenamento" className="mt-4 mb-1.5 block text-sm font-semibold">
              Note (facoltative)
            </label>
            <textarea
              id="note-allenamento"
              className={textareaClass}
              placeholder="Come ti sei sentito? Energia, dolori, sonno…"
              maxLength={1000}
              value={state.notes}
              onChange={(e) => setState((s) => ({ ...s, notes: e.target.value }))}
            />
            {error && (
              <p role="alert" className="mt-3 rounded-xl bg-danger-soft p-3 text-sm font-semibold text-danger">
                {error}
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <Button size="lg" variant="ghost" onClick={() => setFinishing(false)}>
                Continua
              </Button>
              <Button size="lg" variant="primary" icon="check" className="flex-1" disabled={saving} onClick={finish} autoFocus>
                {saving ? "Salvataggio…" : "Salva allenamento"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
