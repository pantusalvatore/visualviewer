"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { importPlan } from "@/lib/actions/plans";
import { Button } from "./ui";

/** Importa una scheda da un file JSON esportato da Carico. */
export function ImportPlanButton() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="ghost" icon="upload" disabled={pending} onClick={() => inputRef.current?.click()}>
        {pending ? "Importazione…" : "Importa JSON"}
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept="application/json,.json"
        className="sr-only"
        aria-label="File JSON della scheda da importare"
        tabIndex={-1}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (!file) return;
          setError(null);
          let json: unknown;
          try {
            json = JSON.parse(await file.text());
          } catch {
            setError("Il file non è un JSON valido.");
            return;
          }
          start(async () => {
            const res = await importPlan(json);
            if (res.ok) router.push(`/schede/${res.data.id}`);
            else setError(res.error);
          });
        }}
      />
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
