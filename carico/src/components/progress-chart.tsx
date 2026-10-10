"use client";

import { useState } from "react";
import { kgToUnit, roundForUnit } from "@/lib/units";
import { useSettings } from "./settings";
import { cx } from "./ui";

export interface ChartPoint {
  date: string; // ISO
  maxWeight: number;
  e1rm: number;
  volume: number;
  totalReps: number;
}

type Metric = "e1rm" | "maxWeight" | "volume" | "totalReps";
const METRICS: { key: Metric; label: string; weight: boolean }[] = [
  { key: "e1rm", label: "1RM stimato", weight: true },
  { key: "maxWeight", label: "Carico max", weight: true },
  { key: "volume", label: "Volume", weight: true },
  { key: "totalReps", label: "Ripetizioni", weight: false },
];

const dateFmt = new Intl.DateTimeFormat("it-IT", { day: "numeric", month: "short" });

/** Grafico a linee in SVG puro: leggero, accessibile, nessuna libreria. */
export function ProgressChart({ points, bodyweight }: { points: ChartPoint[]; bodyweight?: boolean }) {
  const { unit } = useSettings();
  const [metric, setMetric] = useState<Metric>(bodyweight ? "totalReps" : "e1rm");
  const [hover, setHover] = useState<number | null>(null);
  const def = METRICS.find((m) => m.key === metric)!;
  const values = points.map((p) => (def.weight ? roundForUnit(kgToUnit(p[metric], unit), unit) : p[metric]));
  const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1).replace(".", ","));
  const suffix = def.weight ? ` ${unit}` : "";

  const W = 360;
  const H = 190;
  const pad = { l: 34, r: 10, t: 12, b: 26 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || Math.max(1, max * 0.1);
  const lo = Math.max(0, min - span * 0.15);
  const hi = max + span * 0.15;
  const x = (i: number) => pad.l + (points.length === 1 ? (W - pad.l - pad.r) / 2 : (i / (points.length - 1)) * (W - pad.l - pad.r));
  const y = (v: number) => pad.t + (1 - (v - lo) / (hi - lo || 1)) * (H - pad.t - pad.b);
  const path = values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ticks = [0, 0.5, 1].map((t) => lo + (hi - lo) * t);
  const active = hover ?? values.length - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Metrica">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            role="radio"
            aria-checked={metric === m.key}
            onClick={() => setMetric(m.key)}
            className={cx(
              "h-10 rounded-full border px-4 text-sm font-semibold",
              metric === m.key ? "border-ink bg-ink text-bg" : "border-line bg-surface hover:bg-surface-2",
            )}
          >
            {m.label}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted" aria-live="polite">
        {dateFmt.format(new Date(points[active]!.date))}:{" "}
        <strong className="text-2xl font-black text-ink tabular-nums">
          {fmt(values[active]!)}
          {suffix}
        </strong>
      </p>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full touch-none"
        role="img"
        aria-label={`Andamento ${def.label}: da ${fmt(values[0]!)} a ${fmt(values.at(-1)!)}${suffix} in ${points.length} sessioni`}
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - rect.left) / rect.width) * W;
          let best = 0;
          for (let i = 1; i < points.length; i++) if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i;
          setHover(best);
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--c-line)" strokeDasharray="3 4" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10" fill="var(--c-muted)">
              {fmt(Math.round(t))}
            </text>
          </g>
        ))}
        <path d={`${path} L${x(values.length - 1)},${H - pad.b} L${x(0)},${H - pad.b} Z`} fill="var(--c-accent)" opacity="0.1" />
        <path d={path} fill="none" stroke="var(--c-accent)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => (
          <circle key={i} cx={x(i)} cy={y(v)} r={i === active ? 4.5 : 3} fill={i === active ? "var(--c-accent)" : "var(--c-surface)"} stroke="var(--c-accent)" strokeWidth="2" />
        ))}
        {[0, points.length - 1].filter((v, i, a) => a.indexOf(v) === i).map((i) => (
          <text key={i} x={x(i)} y={H - 10} textAnchor={i === 0 && points.length > 1 ? "start" : "end"} fontSize="10" fill="var(--c-muted)">
            {dateFmt.format(new Date(points[i]!.date))}
          </text>
        ))}
      </svg>
    </div>
  );
}
