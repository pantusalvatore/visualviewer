"use server";

import { revalidatePath } from "next/cache";
import { backupSchema, restoreBackup as restore } from "../backup";
import type { ActionResult } from "./plans";

export async function restoreBackup(payload: unknown): Promise<ActionResult<{ plans: number; sessions: number; exercises: number }>> {
  const parsed = backupSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: "Il file non è un backup valido di Carico." };
  try {
    const data = await restore(parsed.data);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Ripristino non riuscito." };
  }
}
