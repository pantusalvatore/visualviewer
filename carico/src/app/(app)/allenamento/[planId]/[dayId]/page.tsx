import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { WorkoutSession, type WorkoutItemInput } from "@/components/workout/workout-session";
import { toExerciseSummary } from "@/lib/exercise";
import { getLastPerformances, getPlan } from "@/lib/queries";

export const metadata: Metadata = { title: "Allenamento" };

export default async function WorkoutPage({ params }: { params: Promise<{ planId: string; dayId: string }> }) {
  const { planId, dayId } = await params;
  const plan = await getPlan(planId);
  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !day) notFound();

  const last = await getLastPerformances(day.items.map((i) => i.exerciseId));
  const items: WorkoutItemInput[] = day.items.map((i) => {
    const ex = toExerciseSummary(i.exercise);
    const perf = last[i.exerciseId];
    return {
      itemId: i.id,
      exerciseId: i.exerciseId,
      slug: ex.slug,
      name: ex.name,
      image: ex.image,
      primaryMuscle: ex.primaryMuscle,
      sets: i.sets,
      repsMin: i.repsMin,
      repsMax: i.repsMax,
      load: i.load,
      restSeconds: i.restSeconds,
      tempo: i.tempo,
      notes: i.notes,
      superset: i.superset,
      last: perf ? { date: perf.date.toISOString(), sets: perf.sets } : null,
    };
  });

  return <WorkoutSession planId={plan.id} planName={plan.name} dayId={day.id} dayName={day.name} items={items} />;
}
