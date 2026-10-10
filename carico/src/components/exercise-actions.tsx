"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteCustomExercise, saveExerciseNotes, toggleFavorite } from "@/lib/actions/exercises";
import { Icon } from "./icon";
import { Button, cx, textareaClass } from "./ui";

export function FavoriteButton({ id, initial }: { id: string; initial: boolean }) {
  const [favorite, setFavorite] = useState(initial);
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      aria-pressed={favorite}
      disabled={pending}
      onClick={() =>
        start(async () => {
          setFavorite((f) => !f);
          setFavorite(await toggleFavorite(id));
        })
      }
      className={cx(
        "inline-flex h-11 items-center gap-2 rounded-xl border px-3.5 text-sm font-semibold transition",
        favorite ? "border-accent bg-accent-soft text-accent" : "border-line bg-surface hover:bg-surface-2",
      )}
    >
      <Icon name="star" filled={favorite} size={20} />
      {favorite ? "Preferito" : "Aggiungi ai preferiti"}
    </button>
  );
}

export function NotesEditor({ id, initial }: { id: string; initial: string }) {
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [pending, start] = useTransition();
  const dirty = value !== saved;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="note-esercizio" className="sr-only">
        Le mie note
      </label>
      <textarea
        id="note-esercizio"
        className={textareaClass}
        placeholder="Regolazioni della macchina, sensazioni, carichi di riferimento…"
        maxLength={2000}
        value={value}
        onChange={(e) => setValue(e.target.value)}
      />
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          size="sm"
          disabled={!dirty || pending}
          onClick={() =>
            start(async () => {
              await saveExerciseNotes(id, value);
              setSaved(value);
            })
          }
        >
          {pending ? "Salvataggio…" : "Salva note"}
        </Button>
        <span className="text-sm text-muted" aria-live="polite">
          {!dirty && saved && !pending ? "Note salvate" : ""}
        </span>
      </div>
    </div>
  );
}

export function DeleteExerciseButton({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="danger"
        icon="trash"
        disabled={pending}
        onClick={() => {
          if (!confirm("Eliminare definitivamente questo esercizio?")) return;
          start(async () => {
            const res = await deleteCustomExercise(id);
            if (res.ok) router.push("/esercizi");
            else setError(res.error);
          });
        }}
      >
        Elimina esercizio
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
