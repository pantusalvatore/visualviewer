import type { Metadata } from "next";
import { CustomExerciseForm } from "@/components/custom-exercise-form";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nuovo esercizio" };

export default function NewExercisePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader back={{ href: "/esercizi", label: "Esercizi" }} eyebrow="Personalizzato" title="Nuovo esercizio" />
      <CustomExerciseForm />
    </div>
  );
}
