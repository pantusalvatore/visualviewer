import { z } from "zod";
import { EQUIPMENT, EXERCISE_TYPES, GOALS, LEVELS, MUSCLE_GROUPS } from "./domain";

/**
 * Formato "portabile" di una scheda: gli esercizi sono referenziati per slug,
 * così la stessa scheda funziona su database diversi (import/export, link condivisi,
 * template e generatore usano tutti questo formato).
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Massimo ${max} caratteri`)
    .optional()
    .nullable()
    .transform((v) => (v ? v : null));

export const planItemSchema = z
  .object({
    exerciseSlug: z.string().min(1, "Esercizio mancante"),
    sets: z.number({ error: "Inserisci un numero" }).int("Numero intero").min(1, "Almeno 1 serie").max(20, "Massimo 20 serie"),
    repsMin: z.number({ error: "Inserisci un numero" }).int("Numero intero").min(1, "Almeno 1 ripetizione").max(100, "Massimo 100"),
    repsMax: z.number({ error: "Inserisci un numero" }).int("Numero intero").min(1, "Almeno 1 ripetizione").max(100, "Massimo 100"),
    load: z.number({ error: "Inserisci un numero" }).min(0, "Carico non valido").max(1000, "Carico non valido").nullable().optional().transform((v) => v ?? null),
    restSeconds: z.number({ error: "Inserisci un numero" }).int().min(0, "Recupero non valido").max(900, "Massimo 15 minuti"),
    tempo: z
      .string()
      .trim()
      .max(12)
      .regex(/^$|^[0-9xX]{1,2}(-[0-9xX]{1,2}){1,3}$/, "Formato tempo: es. 3-1-1-0")
      .optional()
      .nullable()
      .transform((v) => (v ? v.toUpperCase() : null)),
    notes: optionalText(300),
    superset: z
      .string()
      .trim()
      .max(2)
      .regex(/^$|^[A-Za-z]$/, "Usa una lettera (A, B, …)")
      .optional()
      .nullable()
      .transform((v) => (v ? v.toUpperCase() : null)),
  })
  .refine((i) => i.repsMax >= i.repsMin, {
    message: "Il massimo delle ripetizioni deve essere ≥ del minimo",
    path: ["repsMax"],
  });

export const planDaySchema = z.object({
  name: z.string().trim().min(1, "Dai un nome al giorno").max(40, "Massimo 40 caratteri"),
  items: z.array(planItemSchema).max(30, "Massimo 30 esercizi per giorno"),
});

export const planDraftSchema = z.object({
  name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(80, "Massimo 80 caratteri"),
  goal: z.enum(GOALS, { error: "Scegli un obiettivo" }),
  level: z.enum(LEVELS, { error: "Scegli un livello" }),
  daysPerWeek: z.number({ error: "Inserisci un numero" }).int().min(1, "Almeno 1 giorno").max(7, "Massimo 7 giorni"),
  notes: optionalText(1000),
  days: z.array(planDaySchema).min(1, "Aggiungi almeno un giorno").max(7, "Massimo 7 giorni"),
});

export type PlanItemDraft = z.input<typeof planItemSchema>;
export type PlanDayDraft = { name: string; items: PlanItemDraft[] };
export type PlanDraft = Omit<z.input<typeof planDraftSchema>, "days"> & { days: PlanDayDraft[] };
export type PlanDraftParsed = z.output<typeof planDraftSchema>;

/** Esercizio personalizzato esportabile insieme alla scheda. */
export const customExerciseSchema = z.object({
  slug: z.string().min(1),
  name: z.string().trim().min(2, "Il nome deve avere almeno 2 caratteri").max(80),
  nameEn: optionalText(80),
  primaryMuscle: z.enum(MUSCLE_GROUPS, { error: "Scegli il gruppo muscolare" }),
  secondaryMuscles: z.array(z.string()).max(10).default([]),
  equipment: z.enum(EQUIPMENT, { error: "Scegli l'attrezzo" }),
  level: z.enum(LEVELS, { error: "Scegli il livello" }),
  type: z.enum(EXERCISE_TYPES, { error: "Scegli il tipo" }),
  instructions: z
    .object({
      partenza: z.array(z.string()).default([]),
      esecuzione: z.array(z.string()).default([]),
      finale: z.array(z.string()).default([]),
      respirazione: z.array(z.string()).default([]),
    })
    .default({ partenza: [], esecuzione: [], finale: [], respirazione: [] }),
  mistakes: z.array(z.string()).default([]),
  safety: z.array(z.string()).default([]),
  easier: z.array(z.string()).default([]),
  harder: z.array(z.string()).default([]),
  notes: optionalText(2000),
});
export type CustomExerciseExport = z.output<typeof customExerciseSchema>;

/** File JSON di una scheda esportata (o condivisa via link). */
export const planExportSchema = z.object({
  app: z.literal("carico"),
  kind: z.literal("scheda"),
  version: z.literal(1),
  plan: planDraftSchema,
  customExercises: z.array(customExerciseSchema).default([]),
});
export type PlanExport = z.output<typeof planExportSchema>;

/** Restituisce il primo messaggio d'errore leggibile per ogni percorso del form. */
export function zodErrorMap(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}
