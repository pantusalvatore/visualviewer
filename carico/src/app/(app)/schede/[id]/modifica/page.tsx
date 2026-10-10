import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PlanBuilder } from "@/components/builder/plan-builder";
import { PageHeader } from "@/components/ui";
import { getExerciseSummaries, getPlan, planToDraft } from "@/lib/queries";

export const metadata: Metadata = { title: "Modifica scheda" };

export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, exercises] = await Promise.all([getPlan(id), getExerciseSummaries()]);
  if (!plan) notFound();
  return (
    <>
      <PageHeader back={{ href: `/schede/${id}`, label: plan.name }} eyebrow="Costruttore" title="Modifica scheda" />
      <PlanBuilder planId={id} initial={planToDraft(plan)} exercises={exercises} cancelHref={`/schede/${id}`} />
    </>
  );
}
