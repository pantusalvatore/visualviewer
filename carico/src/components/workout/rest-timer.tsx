"use client";

import { useEffect, useRef, useState } from "react";
import { formatSeconds } from "@/lib/progression";
import { Icon } from "../icon";
import { cx } from "../ui";

let audioCtx: AudioContext | null = null;

/** Da chiamare dentro un gesto dell'utente: sblocca l'audio su iOS/Android. */
export function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx ??= new Ctx();
    if (audioCtx.state === "suspended") void audioCtx.resume();
  } catch {}
}

function beep() {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;
  [0, 0.25, 0.5].forEach((offset, i) => {
    const osc = audioCtx!.createOscillator();
    const gain = audioCtx!.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.4, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    osc.connect(gain).connect(audioCtx!.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.22);
  });
}

/**
 * Timer di recupero. Si basa sull'orario di fine (non su un contatore),
 * quindi resta preciso anche se il telefono va in standby o cambi app.
 */
export function RestTimer({
  endAt,
  total,
  onChange,
  onDone,
}: {
  endAt: number;
  total: number;
  onChange: (endAt: number | null, total?: number) => void;
  onDone?: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const fired = useRef(false);
  const remaining = Math.max(0, Math.ceil((endAt - now) / 1000));
  const finished = remaining === 0;

  useEffect(() => {
    fired.current = false;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endAt]);

  useEffect(() => {
    if (!finished || fired.current) return;
    fired.current = true;
    beep();
    navigator.vibrate?.([300, 120, 300, 120, 500]);
    onDone?.();
    const t = setTimeout(() => onChange(null), 4000);
    return () => clearTimeout(t);
  }, [finished, onChange, onDone]);

  const progress = total > 0 ? 1 - remaining / total : 1;

  return (
    <div
      role="timer"
      aria-live={finished ? "assertive" : "off"}
      aria-label="Timer di recupero"
      className={cx(
        "pb-safe fixed inset-x-0 bottom-0 z-40 border-t px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.15)] lg:left-60",
        finished ? "border-ok bg-ok text-white" : "border-line bg-surface",
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className={cx("eyebrow", finished && "!text-white/80")}>{finished ? "Recupero finito" : "Recupero"}</p>
          <p className="text-4xl font-black tabular-nums">{finished ? "Vai!" : formatSeconds(remaining)}</p>
        </div>
        {!finished && (
          <>
            <button
              type="button"
              onClick={() => onChange(Math.max(Date.now(), endAt - 15000))}
              className="h-14 w-14 rounded-2xl border border-line text-sm font-bold"
              aria-label="Togli 15 secondi"
            >
              −15
            </button>
            <button
              type="button"
              onClick={() => onChange(endAt + 15000, total + 15)}
              className="h-14 w-14 rounded-2xl border border-line text-sm font-bold"
              aria-label="Aggiungi 15 secondi"
            >
              +15
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => onChange(null)}
          className={cx("flex h-14 items-center gap-1.5 rounded-2xl px-4 font-bold", finished ? "bg-white/20" : "bg-ink text-bg")}
        >
          <Icon name={finished ? "close" : "skip"} size={20} />
          {finished ? "Chiudi" : "Salta"}
        </button>
      </div>
      <div className="mx-auto mt-3 h-1.5 max-w-3xl overflow-hidden rounded-full bg-surface-2">
        <div className="h-full bg-accent transition-[width] duration-300" style={{ width: `${Math.min(100, progress * 100)}%` }} />
      </div>
    </div>
  );
}
