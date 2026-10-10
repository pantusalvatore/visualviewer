"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "../prisma";
import type { ActionResult } from "./plans";

const workoutSchema = z.object({
  planId: z.string().nullable(),
  dayId: z.string().nullable(),
  planName: z.string().min(1).max(80),
  dayName: z.string().min(1).max(40),
  startedAt: z.iso.datetime(),
  finishedAt: z.iso.datetime(),
  notes: z.string().max(1000).nullable(),
  sets: z
    .array(
      z.object({
        exerciseId: z.string().min(1),
        position: z.number().int().min(0),
        setNumber: z.number().int().min(1),
        weight: z.number().min(0).max(2000),
        reps: z.number().int().min(0).max(1000),
      }),
    )
    .max(500),
});

export type WorkoutPayload = z.input<typeof workoutSchema>;

export async function saveWorkout(payload: WorkoutPayload): Promise<ActionResult<{ id: string }>> {
  const parsed = workoutSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Dati dell'allenamento non validi." };
  const w = parsed.data;
  if (w.sets.length === 0) return { ok: false, error: "Completa almeno una serie prima di salvare." };
  const planExists = w.planId ? await prisma.plan.findUnique({ where: { id: w.planId }, select: { id: true } }) : null;
  const session = await prisma.workoutSession.create({
    data: {
      planId: planExists ? w.planId : null,
      dayId: w.dayId,
      planName: w.planName,
      dayName: w.dayName,
      startedAt: new Date(w.startedAt),
      finishedAt: new Date(w.finishedAt),
      notes: w.notes,
      sets: { create: w.sets.map((s) => ({ ...s, completed: true })) },
    },
    select: { id: true },
  });
  revalidatePath("/storico");
  revalidatePath("/");
  return { ok: true, data: { id: session.id } };
}

export async function deleteSession(id: string): Promise<ActionResult> {
  await prisma.workoutSession.delete({ where: { id } }).catch(() => null);
  revalidatePath("/storico");
  revalidatePath("/");
  return { ok: true };
}
