import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DeleteExerciseButton, FavoriteButton, NotesEditor } from "@/components/exercise-actions";
import { ExerciseImage } from "@/components/exercise-image";
import { Icon } from "@/components/icon";
import { MuscleMap } from "@/components/muscle-map";
import { Badge, Card, LinkButton, PageHeader, SectionTitle } from "@/components/ui";
import {
  EQUIPMENT_LABELS,
  INSTRUCTION_SECTIONS,
  LEVEL_LABELS,
  MUSCLE_LABELS,
  TYPE_LABELS,
  type Muscle,
} from "@/lib/domain";
import { isSlugLike } from "@/lib/exercise";
import { prisma } from "@/lib/prisma";
import { getExerciseBySlug, getExerciseNamesBySlugs } from "@/lib/queries";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ex = await getExerciseBySlug((await params).slug);
  return { title: ex?.name ?? "Esercizio" };
}

export default async function ExerciseDetailPage({ params }: Props) {
  const { slug } = await params;
  const ex = await getExerciseBySlug(slug);
  if (!ex) notFound();

  const variantSlugs = [...ex.easier, ...ex.harder].filter(isSlugLike);
  const [names, historyCount] = await Promise.all([
    getExerciseNamesBySlugs(variantSlugs),
    prisma.workoutSet.count({ where: { exerciseId: ex.id } }),
  ]);

  let step = 0;
  const imageLabels = ["Partenza", "Fine"];

  return (
    <article>
      <PageHeader
        back={{ href: "/esercizi", label: "Esercizi" }}
        eyebrow={MUSCLE_LABELS[ex.primaryMuscle]}
        title={ex.name}
      >
        {ex.nameEn && <p className="-mt-2 text-muted italic">{ex.nameEn}</p>}
        <div className="flex flex-wrap items-center gap-2">
          <FavoriteButton id={ex.id} initial={ex.favorite} />
          {historyCount > 0 && (
            <LinkButton href={`/storico/esercizio/${ex.slug}`} icon="chart">
              Progressi
            </LinkButton>
          )}
          {ex.isCustom && (
            <LinkButton href={`/esercizi/${ex.slug}/modifica`} icon="edit">
              Modifica
            </LinkButton>
          )}
        </div>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
        {/* Colonna visuale */}
        <div className="flex flex-col gap-4 lg:sticky lg:top-8 lg:self-start">
          {ex.images.length > 0 ? (
            <div className={ex.images.length > 1 ? "grid grid-cols-2 gap-2" : ""}>
              {ex.images.slice(0, 2).map((src, i) => (
                <figure key={src} className="flex flex-col gap-1.5">
                  <ExerciseImage
                    src={src}
                    alt={`${ex.name}: posizione di ${i === 0 ? "partenza" : "fine"}`}
                    primary={ex.primaryMuscle}
                    className="aspect-[4/3] rounded-2xl"
                    sizes="(min-width: 1024px) 22vw, 50vw"
                    priority={i === 0}
                  />
                  {ex.images.length > 1 && (
                    <figcaption className="eyebrow">
                      {i + 1}. {imageLabels[i]}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          ) : null}
          <Card className="flex items-center gap-4 p-4">
            <MuscleMap primary={ex.primaryMuscle} secondary={ex.secondaryMuscles} className="w-40 shrink-0 sm:w-48" />
            <dl className="flex flex-col gap-3 text-sm">
              <div>
                <dt className="eyebrow">Primario</dt>
                <dd className="font-semibold">{MUSCLE_LABELS[ex.primaryMuscle]}</dd>
              </div>
              {ex.secondaryMuscles.length > 0 && (
                <div>
                  <dt className="eyebrow">Secondari</dt>
                  <dd>{ex.secondaryMuscles.map((m) => MUSCLE_LABELS[m as Muscle] ?? m).join(", ")}</dd>
                </div>
              )}
            </dl>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Badge>{EQUIPMENT_LABELS[ex.equipment]}</Badge>
            <Badge>{LEVEL_LABELS[ex.level]}</Badge>
            <Badge>{TYPE_LABELS[ex.type]}</Badge>
            {ex.isCustom && <Badge tone="accent">Personalizzato</Badge>}
          </div>
          {ex.imageCredit && <p className="text-xs text-muted">{ex.imageCredit}</p>}
        </div>

        {/* Colonna testuale */}
        <div className="flex flex-col gap-8">
          <section aria-labelledby="come-si-esegue">
            <h2 id="come-si-esegue" className="mb-4 text-xl font-extrabold">
              Come si esegue
            </h2>
            <div className="flex flex-col gap-5">
              {INSTRUCTION_SECTIONS.map(({ key, label }) => {
                const steps = ex.instructions[key];
                if (steps.length === 0) return null;
                return (
                  <div key={key}>
                    <h3 className="eyebrow mb-2">{label}</h3>
                    <ol className="flex flex-col gap-2.5">
                      {steps.map((text) => {
                        step++;
                        return (
                          <li key={step} className="flex gap-3">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-bold text-bg">
                              {step}
                            </span>
                            <span className="pt-0.5 leading-relaxed">{text}</span>
                          </li>
                        );
                      })}
                    </ol>
                  </div>
                );
              })}
            </div>
          </section>

          {ex.mistakes.length > 0 && (
            <section aria-labelledby="errori">
              <h2 id="errori" className="mb-3 text-xl font-extrabold">
                Errori comuni
              </h2>
              <ul className="flex flex-col gap-2">
                {ex.mistakes.map((m) => (
                  <li key={m} className="flex gap-3 rounded-xl bg-danger-soft/60 p-3">
                    <Icon name="close" size={20} className="mt-0.5 shrink-0 text-danger" />
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {ex.safety.length > 0 && (
            <section aria-labelledby="sicurezza">
              <h2 id="sicurezza" className="mb-3 text-xl font-extrabold">
                Sicurezza
              </h2>
              <ul className="flex flex-col gap-2">
                {ex.safety.map((s) => (
                  <li key={s} className="flex gap-3 rounded-xl bg-ok-soft/70 p-3">
                    <Icon name="info" size={20} className="mt-0.5 shrink-0 text-ok" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {(ex.easier.length > 0 || ex.harder.length > 0) && (
            <section aria-labelledby="varianti" className="grid gap-4 sm:grid-cols-2">
              <h2 id="varianti" className="text-xl font-extrabold sm:col-span-2">
                Varianti
              </h2>
              {[
                { title: "Più facili", list: ex.easier },
                { title: "Più difficili", list: ex.harder },
              ].map(({ title, list }) =>
                list.length > 0 ? (
                  <div key={title}>
                    <SectionTitle>{title}</SectionTitle>
                    <ul className="flex flex-col gap-2">
                      {list.map((v) => {
                        const name = names.get(v);
                        return (
                          <li key={v}>
                            {name ? (
                              <Link
                                href={`/esercizi/${v}`}
                                className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-line bg-surface px-3 py-2 font-semibold hover:bg-surface-2"
                              >
                                {name}
                                <Icon name="chevron" size={18} className="text-muted" />
                              </Link>
                            ) : (
                              <span className="flex min-h-11 items-center rounded-xl bg-surface-2 px-3 py-2">{v}</span>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null,
              )}
            </section>
          )}

          <section aria-labelledby="note">
            <h2 id="note" className="mb-3 text-xl font-extrabold">
              Le mie note
            </h2>
            <NotesEditor id={ex.id} initial={ex.notes ?? ""} />
          </section>

          {ex.isCustom && <DeleteExerciseButton id={ex.id} />}
        </div>
      </div>
    </article>
  );
}
