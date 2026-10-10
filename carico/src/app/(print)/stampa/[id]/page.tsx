import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { formatReps, formatRest } from "@/components/builder/state";
import { LogoMark } from "@/components/logo";
import { PrintToolbar } from "@/components/print-toolbar";
import { Weight } from "@/components/settings";
import { GOAL_LABELS, GOALS, isOneOf, LEVEL_LABELS, LEVELS, MUSCLE_LABELS } from "@/lib/domain";
import { toExerciseSummary } from "@/lib/exercise";
import { getPlan } from "@/lib/queries";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ immagini?: string; settimane?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const plan = await getPlan((await params).id);
  // Il titolo diventa il nome del file PDF proposto dal browser.
  return { title: { absolute: plan ? `Scheda ${plan.name}` : "Scheda" } };
}

export default async function PrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const plan = await getPlan(id);
  if (!plan) notFound();
  const showImages = sp.immagini !== "0";
  const weeks = Math.min(6, Math.max(0, Number(sp.settimane ?? "4") || 0));
  const goal = isOneOf(GOALS, plan.goal) ? GOAL_LABELS[plan.goal] : plan.goal;
  const level = isOneOf(LEVELS, plan.level) ? LEVEL_LABELS[plan.level] : plan.level;

  return (
    <>
      <Suspense>
        <PrintToolbar backHref={`/schede/${plan.id}`} />
      </Suspense>
      <style>{`@page { size: A4; margin: 12mm; } @media print { html { --c-bg:#fff; --c-surface:#fff; --c-ink:#000; --c-muted:#444; --c-line:#bbb; --c-accent:#c2410c; --c-accent-ink:#fff; } }`}</style>
      <article className="mx-auto my-6 max-w-[210mm] bg-white p-[10mm] text-[11pt] text-black shadow-lg print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="mb-5 flex items-start justify-between gap-4 border-b-2 border-black pb-3">
          <div>
            <p className="text-[9pt] font-bold tracking-[0.15em] text-neutral-500 uppercase">Scheda di allenamento</p>
            <h1 className="text-[20pt] leading-tight font-black">{plan.name}</h1>
            <p className="mt-1 text-[10pt] text-neutral-600">
              {goal} · {level} · {plan.daysPerWeek} allenamenti a settimana
            </p>
            {plan.notes && <p className="mt-1 text-[10pt] text-neutral-700 italic">{plan.notes}</p>}
          </div>
          <div className="flex flex-col items-end gap-1 text-right text-[9pt] text-neutral-500">
            <LogoMark size={28} />
            <span>Nome: ____________________</span>
            <span>Inizio: ____ / ____ / ______</span>
          </div>
        </header>

        {plan.days.map((day) => (
          <section key={day.id} className="mb-6 break-inside-avoid-page">
            <h2 className="mb-1.5 flex items-baseline gap-2 text-[14pt] font-black">
              {day.name}
              <span className="text-[9pt] font-semibold text-neutral-500">{day.items.length} esercizi</span>
            </h2>
            <table className="w-full border-collapse text-[9.5pt]">
              <thead>
                <tr className="bg-neutral-100 text-left text-[8pt] tracking-wider text-neutral-600 uppercase">
                  <th className="border border-neutral-300 px-1.5 py-1 w-6">#</th>
                  <th className="border border-neutral-300 px-1.5 py-1">Esercizio</th>
                  <th className="border border-neutral-300 px-1.5 py-1 text-center">Serie × rip.</th>
                  <th className="border border-neutral-300 px-1.5 py-1 text-center">Rec.</th>
                  <th className="border border-neutral-300 px-1.5 py-1 text-center">Carico</th>
                  {Array.from({ length: weeks }, (_, w) => (
                    <th key={w} className="w-[13mm] border border-neutral-300 px-1 py-1 text-center">
                      Sett. {w + 1}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {day.items.map((item, i) => {
                  const ex = toExerciseSummary(item.exercise);
                  return (
                    <tr key={item.id} className="break-inside-avoid">
                      <td className="border border-neutral-300 px-1.5 py-1 text-center font-bold">
                        {i + 1}
                        {item.superset && <span className="block text-[7pt] text-orange-700">SS{item.superset}</span>}
                      </td>
                      <td className="border border-neutral-300 px-1.5 py-1">
                        <div className="flex items-center gap-2">
                          {showImages && ex.image && (
                            // eslint-disable-next-line @next/next/no-img-element -- immagine statica per la stampa
                            <img src={ex.image} alt="" className="h-[12mm] w-[16mm] shrink-0 rounded object-cover" />
                          )}
                          <div>
                            <p className="font-bold leading-tight">{ex.name}</p>
                            <p className="text-[8pt] text-neutral-600">
                              {MUSCLE_LABELS[ex.primaryMuscle]}
                              {item.tempo && ` · tempo ${item.tempo}`}
                              {item.notes && ` · ${item.notes}`}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="border border-neutral-300 px-1.5 py-1 text-center font-bold whitespace-nowrap">
                        {item.sets} × {formatReps(item.repsMin, item.repsMax)}
                      </td>
                      <td className="border border-neutral-300 px-1.5 py-1 text-center whitespace-nowrap">{formatRest(item.restSeconds)}</td>
                      <td className="border border-neutral-300 px-1.5 py-1 text-center whitespace-nowrap">
                        <Weight kg={item.load} fallback="" />
                      </td>
                      {Array.from({ length: weeks }, (_, w) => (
                        <td key={w} className="border border-neutral-300" />
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        ))}
        <footer className="mt-4 border-t border-neutral-300 pt-2 text-[8pt] text-neutral-500">
          Generata con Carico · Rec. = recupero tra le serie · Tempo = eccentrica-pausa-concentrica-pausa (secondi) · SS = superset
        </footer>
      </article>
    </>
  );
}
