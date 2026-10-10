"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { saveCustomExercise } from "@/lib/actions/exercises";
import {
  ALL_MUSCLES,
  EQUIPMENT,
  EQUIPMENT_LABELS,
  EXERCISE_TYPES,
  LEVELS,
  LEVEL_LABELS,
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  TYPE_LABELS,
} from "@/lib/domain";
import type { ExerciseDetail } from "@/lib/exercise";
import { Button, Card, Field, inputClass, Select, textareaClass } from "./ui";

type State = Awaited<ReturnType<typeof saveCustomExercise>> | null;

export function CustomExerciseForm({ exercise }: { exercise?: ExerciseDetail }) {
  const router = useRouter();
  const action = saveCustomExercise.bind(null, exercise?.id ?? null);
  const [state, formAction, pending] = useActionState<State, FormData>(action, null);
  const [preview, setPreview] = useState<string | null>(exercise?.images[0] ?? null);
  const [removePhoto, setRemovePhoto] = useState(false);

  useEffect(() => {
    if (state?.ok) router.push(`/esercizi/${state.data.slug}`);
  }, [state, router]);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const err = (k: string) => errors[k];
  const describedBy = (k: string) => (err(k) ? `${k}-error` : undefined);
  const join = (list?: string[]) => (list ?? []).join("\n");

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {state && !state.ok && (
        <p role="alert" className="rounded-xl bg-danger-soft p-3 font-semibold text-danger">
          {state.error}
        </p>
      )}

      <Card className="grid gap-4 p-4 sm:grid-cols-2 md:p-6">
        <Field label="Nome" htmlFor="name" error={err("name")} className="sm:col-span-2">
          <input
            id="name"
            name="name"
            required
            minLength={2}
            maxLength={80}
            defaultValue={exercise?.name}
            className={inputClass}
            aria-invalid={!!err("name")}
            aria-describedby={describedBy("name")}
          />
        </Field>
        <Field label="Nome inglese (facoltativo)" htmlFor="nameEn" className="sm:col-span-2">
          <input id="nameEn" name="nameEn" maxLength={80} defaultValue={exercise?.nameEn ?? ""} className={inputClass} />
        </Field>
        <Field label="Gruppo muscolare" htmlFor="primaryMuscle" error={err("primaryMuscle")}>
          <Select id="primaryMuscle" name="primaryMuscle" defaultValue={exercise?.primaryMuscle ?? ""} aria-invalid={!!err("primaryMuscle")}>
            <option value="" disabled>
              Scegli…
            </option>
            {MUSCLE_GROUPS.map((m) => (
              <option key={m} value={m}>
                {MUSCLE_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Attrezzo" htmlFor="equipment" error={err("equipment")}>
          <Select id="equipment" name="equipment" defaultValue={exercise?.equipment ?? ""} aria-invalid={!!err("equipment")}>
            <option value="" disabled>
              Scegli…
            </option>
            {EQUIPMENT.map((m) => (
              <option key={m} value={m}>
                {EQUIPMENT_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Livello" htmlFor="level" error={err("level")}>
          <Select id="level" name="level" defaultValue={exercise?.level ?? "principiante"}>
            {LEVELS.map((m) => (
              <option key={m} value={m}>
                {LEVEL_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Tipo" htmlFor="type" error={err("type")}>
          <Select id="type" name="type" defaultValue={exercise?.type ?? "multiarticolare"}>
            {EXERCISE_TYPES.map((m) => (
              <option key={m} value={m}>
                {TYPE_LABELS[m]}
              </option>
            ))}
          </Select>
        </Field>
        <fieldset className="sm:col-span-2">
          <legend className="mb-2 text-sm font-semibold">Muscoli secondari</legend>
          <div className="flex flex-wrap gap-2">
            {ALL_MUSCLES.map((m) => (
              <label
                key={m}
                className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-medium has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent"
              >
                <input
                  type="checkbox"
                  name="secondaryMuscles"
                  value={m}
                  defaultChecked={exercise?.secondaryMuscles.includes(m)}
                  className="size-4 accent-[var(--c-accent)]"
                />
                {MUSCLE_LABELS[m]}
              </label>
            ))}
          </div>
        </fieldset>
      </Card>

      <Card className="grid gap-4 p-4 md:p-6">
        <div>
          <h2 className="text-lg font-bold">Spiegazione del movimento</h2>
          <p className="text-sm text-muted">Scrivi un passo per riga: verranno numerati automaticamente.</p>
        </div>
        <Field label="Posizione di partenza" htmlFor="partenza">
          <textarea id="partenza" name="partenza" className={textareaClass} defaultValue={join(exercise?.instructions.partenza)} />
        </Field>
        <Field label="Esecuzione" htmlFor="esecuzione" error={err("instructions")}>
          <textarea
            id="esecuzione"
            name="esecuzione"
            className={textareaClass}
            defaultValue={join(exercise?.instructions.esecuzione)}
            aria-invalid={!!err("instructions")}
          />
        </Field>
        <Field label="Posizione finale" htmlFor="finale">
          <textarea id="finale" name="finale" className={textareaClass} defaultValue={join(exercise?.instructions.finale)} />
        </Field>
        <Field label="Respirazione" htmlFor="respirazione">
          <textarea
            id="respirazione"
            name="respirazione"
            className={textareaClass}
            defaultValue={join(exercise?.instructions.respirazione)}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Errori comuni" htmlFor="mistakes" hint="Uno per riga">
            <textarea id="mistakes" name="mistakes" className={textareaClass} defaultValue={join(exercise?.mistakes)} />
          </Field>
          <Field label="Consigli di sicurezza" htmlFor="safety" hint="Uno per riga">
            <textarea id="safety" name="safety" className={textareaClass} defaultValue={join(exercise?.safety)} />
          </Field>
          <Field label="Varianti più facili" htmlFor="easier" hint="Una per riga">
            <textarea id="easier" name="easier" className={textareaClass} defaultValue={join(exercise?.easier)} />
          </Field>
          <Field label="Varianti più difficili" htmlFor="harder" hint="Una per riga">
            <textarea id="harder" name="harder" className={textareaClass} defaultValue={join(exercise?.harder)} />
          </Field>
        </div>
      </Card>

      <Card className="grid gap-4 p-4 md:p-6">
        <Field label="Foto (facoltativa)" htmlFor="photo" error={err("photo")} hint="JPG, PNG o WebP, massimo 6 MB. Dal telefono puoi scattarla al momento.">
          <input
            id="photo"
            name="photo"
            type="file"
            accept="image/*"
            className="block w-full text-sm file:mr-3 file:h-11 file:rounded-xl file:border-0 file:bg-surface-2 file:px-4 file:font-semibold file:text-ink"
            onChange={(e) => {
              const f = e.target.files?.[0];
              setPreview(f ? URL.createObjectURL(f) : (exercise?.images[0] ?? null));
              setRemovePhoto(false);
            }}
          />
        </Field>
        {preview && !removePhoto && (
          <div className="flex items-end gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element -- anteprima locale (blob:) */}
            <img src={preview} alt="Anteprima della foto" className="h-32 w-44 rounded-xl object-cover" />
            {exercise?.images[0] && (
              <Button size="sm" variant="ghost" icon="trash" onClick={() => setRemovePhoto(true)}>
                Rimuovi foto
              </Button>
            )}
          </div>
        )}
        <input type="hidden" name="removePhoto" value={removePhoto ? "1" : "0"} />
        <Field label="Le mie note" htmlFor="notes">
          <textarea id="notes" name="notes" maxLength={2000} className={textareaClass} defaultValue={exercise?.notes ?? ""} />
        </Field>
      </Card>

      <div className="sticky bottom-20 z-10 flex gap-3 lg:bottom-4">
        <Button type="submit" variant="primary" size="lg" className="flex-1 shadow-lg sm:flex-none" disabled={pending}>
          {pending ? "Salvataggio…" : exercise ? "Salva modifiche" : "Crea esercizio"}
        </Button>
      </div>
    </form>
  );
}
