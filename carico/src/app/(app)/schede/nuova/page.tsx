import type { Metadata } from "next";
import { PlanBuilder } from "@/components/builder/plan-builder";
import { PageHeader } from "@/components/ui";
import type { PlanDraft } from "@/lib/plan-schema";
import { getExerciseSummaries } from "@/lib/queries";
import { getTemplate } from "@/lib/templates";

export const metadata: Metadata = { title: "Nuova scheda" };

const EMPTY: PlanDraft = {
  name: "",
  goal: "ipertrofia",
  level: "intermedio",
  daysPerWeek: 3,
  notes: "",
  days: [
    { name: "Giorno A", items: [] },
    { name: "Giorno B", items: [] },
    { name: "Giorno C", items: [] },
  ],
};

export default async function NewPlanPage({ searchParams }: { searchParams: Promise<{ template?: string }> }) {
  const { template } = await searchParams;
  const tpl = template ? getTemplate(template) : undefined;
  const exercises = await getExerciseSummaries();
  return (
    <>
      <PageHeader
        back={{ href: "/schede", label: "Schede" }}
        eyebrow={tpl ? `Dal template ${tpl.title}` : "Costruttore"}
        title="Nuova scheda"
      />
      <PlanBuilder planId={null} initial={tpl ? structuredClone(tpl.plan) : EMPTY} exercises={exercises} cancelHref="/schede" />
    </>
  );
}
