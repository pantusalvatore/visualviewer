import type { Metadata } from "next";
import { Suspense } from "react";
import { ExerciseLibrary } from "@/components/exercise-library";
import { LinkButton, PageHeader } from "@/components/ui";
import { getExerciseSummaries } from "@/lib/queries";

export const metadata: Metadata = { title: "Esercizi" };

export default async function ExercisesPage() {
  const exercises = await getExerciseSummaries();
  return (
    <>
      <PageHeader
        eyebrow="Libreria"
        title="Esercizi"
        actions={
          <LinkButton href="/esercizi/nuovo" variant="primary" icon="plus" size="md">
            <span className="hidden sm:inline">Nuovo esercizio</span>
            <span className="sm:hidden">Nuovo</span>
          </LinkButton>
        }
      />
      <Suspense>
        <ExerciseLibrary exercises={exercises} />
      </Suspense>
    </>
  );
}
