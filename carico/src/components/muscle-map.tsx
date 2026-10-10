import type { ReactElement } from "react";

/**
 * Mappa muscolare schematica (vista frontale e posteriore) generata in SVG.
 * Evidenzia il muscolo primario (colore pieno) e i secondari (tono tenue).
 * Usata nella pagina dettaglio e come segnaposto per gli esercizi senza foto.
 */

type Shape = ReactElement;
const e = (cx: number, cy: number, rx: number, ry: number, rot = 0): Shape => (
  <ellipse cx={cx} cy={cy} rx={rx} ry={ry} transform={rot ? `rotate(${rot} ${cx} ${cy})` : undefined} />
);
const r = (x: number, y: number, w: number, h: number, rx = 3): Shape => <rect x={x} y={y} width={w} height={h} rx={rx} />;
const p = (d: string): Shape => <path d={d} />;

/** Forme per ciascun muscolo; le coordinate sono nel viewBox 0 0 200 170. */
const REGIONS: Record<string, Shape[]> = {
  // vista frontale (centro x = 50)
  spalle: [e(31, 39, 7, 7.5), e(69, 39, 7, 7.5), e(131, 39, 7, 7.5), e(169, 39, 7, 7.5)],
  petto: [p("M37 37 Q44 34 49 36 L49 50 Q42 53 36 48 Z"), p("M63 37 Q56 34 51 36 L51 50 Q58 53 64 48 Z")],
  bicipiti: [e(27.5, 55, 4.2, 9, 12), e(72.5, 55, 4.2, 9, -12)],
  avambracci: [e(23.5, 75, 3.8, 10, 6), e(76.5, 75, 3.8, 10, -6), e(123.5, 75, 3.8, 10, 6), e(176.5, 75, 3.8, 10, -6)],
  addominali: [r(44.5, 53, 11, 26, 4)],
  obliqui: [p("M37 55 L43 54 L43 78 L39 80 Z"), p("M63 55 L57 54 L57 78 L61 80 Z")],
  quadricipiti: [e(42.5, 108, 6.5, 16, 3), e(57.5, 108, 6.5, 16, -3)],
  adduttori: [e(47.5, 101, 2.6, 9, -6), e(52.5, 101, 2.6, 9, 6)],
  "flessori dell'anca": [e(43, 88, 4, 3.5, 30), e(57, 88, 4, 3.5, -30)],
  // vista posteriore (centro x = 150)
  trapezi: [p("M150 27 L162 34 L156 46 L150 52 L144 46 L138 34 Z")],
  dorsali: [p("M139 45 L148 52 L148 66 Q141 63 137 56 Z"), p("M161 45 L152 52 L152 66 Q159 63 163 56 Z")],
  tricipiti: [e(127.5, 55, 4.2, 9, 12), e(172.5, 55, 4.2, 9, -12)],
  lombari: [r(145, 66, 10, 13, 3)],
  glutei: [e(143.5, 88, 7, 7.5), e(156.5, 88, 7, 7.5)],
  femorali: [e(142.5, 110, 6, 13, 3), e(157.5, 110, 6, 13, -3)],
  polpacci: [e(141.5, 138, 4.8, 10.5, 2), e(158.5, 138, 4.8, 10.5, -2)],
  abduttori: [e(136.5, 84, 2.8, 6, 10), e(163.5, 84, 2.8, 6, -10)],
};

/** Ogni gruppo dell'app corrisponde a una o più regioni del disegno. */
const GROUP_REGIONS: Record<string, string[]> = {
  petto: ["petto"],
  schiena: ["dorsali", "trapezi"],
  spalle: ["spalle"],
  bicipiti: ["bicipiti"],
  tricipiti: ["tricipiti"],
  avambracci: ["avambracci"],
  quadricipiti: ["quadricipiti"],
  femorali: ["femorali"],
  glutei: ["glutei"],
  polpacci: ["polpacci"],
  addominali: ["addominali"],
  lombari: ["lombari"],
  core: ["obliqui", "addominali", "lombari"],
  cardio: [],
  trapezi: ["trapezi"],
  dorsali: ["dorsali"],
  obliqui: ["obliqui"],
  adduttori: ["adduttori"],
  abduttori: ["abduttori"],
  "flessori dell'anca": ["flessori dell'anca"],
};

function Silhouette({ cx }: { cx: number }) {
  const d = cx - 50;
  return (
    <g stroke="var(--c-body)" strokeLinecap="round" fill="none">
      <circle cx={cx} cy={16} r={9.5} fill="var(--c-body)" stroke="none" />
      <path d={`M${36 + d} 32 Q${50 + d} 27 ${64 + d} 32 L${68 + d} 46 L${64 + d} 80 L${61 + d} 93 L${39 + d} 93 L${36 + d} 80 L${32 + d} 46 Z`} fill="var(--c-body)" stroke="none" />
      <path d={`M${32 + d} 36 L${26 + d} 61 L${23 + d} 88`} strokeWidth={9} />
      <path d={`M${68 + d} 36 L${74 + d} 61 L${77 + d} 88`} strokeWidth={9} />
      <path d={`M${43 + d} 92 L${42 + d} 126 L${41 + d} 160`} strokeWidth={13} />
      <path d={`M${57 + d} 92 L${58 + d} 126 L${59 + d} 160`} strokeWidth={13} />
    </g>
  );
}

export function MuscleMap({
  primary,
  secondary = [],
  className,
  title,
}: {
  primary: string;
  secondary?: string[];
  className?: string;
  title?: string;
}) {
  const primaryRegions = new Set(GROUP_REGIONS[primary] ?? []);
  const secondaryRegions = new Set(secondary.flatMap((m) => GROUP_REGIONS[m] ?? []).filter((x) => !primaryRegions.has(x)));
  const fillFor = (region: string) =>
    primaryRegions.has(region) ? "var(--c-accent)" : secondaryRegions.has(region) ? "var(--c-secondary-muscle)" : "var(--c-line)";

  return (
    <svg viewBox="0 0 200 170" className={className} role="img" aria-label={title ?? `Muscolo principale: ${primary}`}>
      <Silhouette cx={50} />
      <Silhouette cx={150} />
      {Object.entries(REGIONS).map(([region, shapes]) => (
        <g key={region} fill={fillFor(region)}>
          {shapes.map((s, i) => (
            <g key={i}>{s}</g>
          ))}
        </g>
      ))}
      {primary === "cardio" && (
        <path
          d="M50 52 C 44 44, 35 48, 38 56 C 40 61, 46 64, 50 68 C 54 64, 60 61, 62 56 C 65 48, 56 44, 50 52 Z"
          fill="var(--c-accent)"
        />
      )}
      <text x="50" y="168" textAnchor="middle" fontSize="8" fill="var(--c-muted)" fontWeight="600">
        FRONTE
      </text>
      <text x="150" y="168" textAnchor="middle" fontSize="8" fill="var(--c-muted)" fontWeight="600">
        RETRO
      </text>
    </svg>
  );
}
