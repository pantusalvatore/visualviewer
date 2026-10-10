// Vocabolario del dominio: valori ammessi ed etichette italiane.
// Tutti i valori salvati nel DB passano da qui, così filtri, form e seed
// condividono la stessa fonte di verità.

export const MUSCLE_GROUPS = [
  "petto",
  "schiena",
  "spalle",
  "bicipiti",
  "tricipiti",
  "avambracci",
  "quadricipiti",
  "femorali",
  "glutei",
  "polpacci",
  "addominali",
  "lombari",
  "core",
  "cardio",
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

/** Muscoli che possono comparire come secondari (gruppi + distretti più fini). */
export const EXTRA_MUSCLES = ["trapezi", "dorsali", "obliqui", "adduttori", "abduttori", "flessori dell'anca"] as const;
export type Muscle = MuscleGroup | (typeof EXTRA_MUSCLES)[number];
export const ALL_MUSCLES: readonly Muscle[] = [...MUSCLE_GROUPS, ...EXTRA_MUSCLES];

export const EQUIPMENT = [
  "bilanciere",
  "manubri",
  "macchinario",
  "cavi",
  "corpo-libero",
  "kettlebell",
  "elastici",
  "altro",
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const LEVELS = ["principiante", "intermedio", "avanzato"] as const;
export type Level = (typeof LEVELS)[number];

export const EXERCISE_TYPES = ["multiarticolare", "isolamento", "cardio", "mobilita"] as const;
export type ExerciseType = (typeof EXERCISE_TYPES)[number];

export const GOALS = ["ipertrofia", "forza", "dimagrimento", "resistenza"] as const;
export type Goal = (typeof GOALS)[number];

export const MUSCLE_LABELS: Record<Muscle, string> = {
  petto: "Petto",
  schiena: "Schiena",
  spalle: "Spalle",
  bicipiti: "Bicipiti",
  tricipiti: "Tricipiti",
  avambracci: "Avambracci",
  quadricipiti: "Quadricipiti",
  femorali: "Femorali",
  glutei: "Glutei",
  polpacci: "Polpacci",
  addominali: "Addominali",
  lombari: "Lombari",
  core: "Core",
  cardio: "Cardio",
  trapezi: "Trapezi",
  dorsali: "Dorsali",
  obliqui: "Obliqui",
  adduttori: "Adduttori",
  abduttori: "Abduttori",
  "flessori dell'anca": "Flessori dell'anca",
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  bilanciere: "Bilanciere",
  manubri: "Manubri",
  macchinario: "Macchinario",
  cavi: "Cavi",
  "corpo-libero": "Corpo libero",
  kettlebell: "Kettlebell",
  elastici: "Elastici",
  altro: "Altro",
};

export const LEVEL_LABELS: Record<Level, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzato: "Avanzato",
};

export const TYPE_LABELS: Record<ExerciseType, string> = {
  multiarticolare: "Multiarticolare",
  isolamento: "Isolamento",
  cardio: "Cardio",
  mobilita: "Mobilità",
};

export const GOAL_LABELS: Record<Goal, string> = {
  ipertrofia: "Ipertrofia",
  forza: "Forza",
  dimagrimento: "Dimagrimento",
  resistenza: "Resistenza",
};

export interface Instructions {
  partenza: string[];
  esecuzione: string[];
  finale: string[];
  respirazione: string[];
}

export const INSTRUCTION_SECTIONS: { key: keyof Instructions; label: string }[] = [
  { key: "partenza", label: "Posizione di partenza" },
  { key: "esecuzione", label: "Esecuzione" },
  { key: "finale", label: "Posizione finale" },
  { key: "respirazione", label: "Respirazione" },
];

export function isOneOf<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}
