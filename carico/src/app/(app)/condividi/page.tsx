import type { Metadata } from "next";
import { ShareImport } from "@/components/share-import";
import { PageHeader } from "@/components/ui";
import { getExerciseSummaries } from "@/lib/queries";

export const metadata: Metadata = { title: "Scheda condivisa" };

export default async function SharePage() {
  const exercises = await getExerciseSummaries();
  return (
    <>
      <PageHeader back={{ href: "/schede", label: "Schede" }} eyebrow="Condivisione" title="Scheda condivisa" />
      <ShareImport names={Object.fromEntries(exercises.map((e) => [e.slug, e.name]))} />
    </>
  );
}
