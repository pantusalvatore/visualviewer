import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomExerciseForm } from "@/components/custom-exercise-form";
import { PageHeader } from "@/components/ui";
import { getExerciseBySlug } from "@/lib/queries";

export const metadata: Metadata = { title: "Modifica esercizio" };

export default async function EditExercisePage({ params }: { params: Promise<{ slug: string }> }) {
  const ex = await getExerciseBySlug((await params).slug);
  if (!ex || !ex.isCustom) notFound();
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: `/esercizi/${ex.slug}`, label: ex.name }} eyebrow="Personalizzato" title="Modifica esercizio" />
      <CustomExerciseForm exercise={ex} />
    </div>
  );
}
