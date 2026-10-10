import type { Metadata } from "next";
import { PlanGenerator } from "@/components/plan-generator";
import { PageHeader } from "@/components/ui";
import { getExerciseSummaries } from "@/lib/queries";

export const metadata: Metadata = { title: "Generatore di schede" };

export default async function GeneratePage() {
  const exercises = await getExerciseSummaries();
  return (
    <>
      <PageHeader back={{ href: "/schede", label: "Schede" }} eyebrow="Generatore automatico" title="Crea una scheda su misura" />
      <PlanGenerator exercises={exercises} />
    </>
  );
}
