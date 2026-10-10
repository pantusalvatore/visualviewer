"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { restoreBackup } from "@/lib/actions/backup";
import type { WeightUnit } from "@/lib/units";
import { THEME_KEY, UNIT_KEY, useSettings, type ThemePref } from "./settings";
import { Button, Card, ChoiceChips } from "./ui";

export function PreferencesCard() {
  const { theme, unit, setTheme, setUnit } = useSettings();
  return (
    <Card className="flex flex-col gap-5 p-4 md:p-5">
      <h2 className="text-lg font-extrabold">Preferenze</h2>
      <ChoiceChips<ThemePref>
        name="tema"
        legend="Tema"
        value={theme}
        options={[
          { value: "system", label: "Automatico" },
          { value: "light", label: "Chiaro" },
          { value: "dark", label: "Scuro" },
        ]}
        onChange={setTheme}
      />
      <ChoiceChips<WeightUnit>
        name="unita"
        legend="Unità di misura dei carichi"
        value={unit}
        options={[
          { value: "kg", label: "Chilogrammi (kg)" },
          { value: "lb", label: "Libbre (lb)" },
        ]}
        onChange={setUnit}
      />
      <p className="text-sm text-muted">I carichi sono salvati in kg e convertiti automaticamente: puoi cambiare unità quando vuoi.</p>
    </Card>
  );
}

export function BackupCard() {
  const router = useRouter();
  const { setTheme, setUnit } = useSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();

  async function download() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/backup");
      if (!res.ok) throw new Error();
      const data = await res.json();
      data.settings = { theme: localStorage.getItem(THEME_KEY) ?? "system", unit: localStorage.getItem(UNIT_KEY) ?? "kg" };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `carico-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      setMessage({ ok: true, text: "Backup scaricato." });
    } catch {
      setMessage({ ok: false, text: "Impossibile creare il backup." });
    } finally {
      setBusy(false);
    }
  }

  async function restore(file: File) {
    let json: { settings?: { theme?: string; unit?: string } };
    try {
      json = JSON.parse(await file.text());
    } catch {
      setMessage({ ok: false, text: "Il file non è un JSON valido." });
      return;
    }
    if (!confirm("Il ripristino sostituisce schede, storico ed esercizi personalizzati attuali. Continuare?")) return;
    start(async () => {
      const res = await restoreBackup(json);
      if (!res.ok) {
        setMessage({ ok: false, text: res.error });
        return;
      }
      const s = json.settings;
      if (s?.theme === "system" || s?.theme === "light" || s?.theme === "dark") setTheme(s.theme);
      if (s?.unit === "kg" || s?.unit === "lb") setUnit(s.unit);
      setMessage({
        ok: true,
        text: `Ripristinati ${res.data.plans} schede, ${res.data.sessions} allenamenti e ${res.data.exercises} esercizi personalizzati.`,
      });
      router.refresh();
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-4 md:p-5">
      <div>
        <h2 className="text-lg font-extrabold">Backup e ripristino</h2>
        <p className="text-sm text-muted">
          Un unico file JSON con schede, storico, esercizi personalizzati (foto comprese), preferiti, note e preferenze.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" icon="download" onClick={download} disabled={busy}>
          {busy ? "Preparazione…" : "Scarica backup"}
        </Button>
        <Button icon="upload" onClick={() => inputRef.current?.click()} disabled={pending}>
          {pending ? "Ripristino…" : "Ripristina da file"}
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-label="File di backup da ripristinare"
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void restore(f);
          }}
        />
      </div>
      {message && (
        <p role="status" className={message.ok ? "font-semibold text-ok" : "font-semibold text-danger"}>
          {message.text}
        </p>
      )}
    </Card>
  );
}
