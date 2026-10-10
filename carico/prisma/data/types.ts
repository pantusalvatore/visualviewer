import type { Equipment, ExerciseType, Level, Muscle, MuscleGroup } from "../../src/lib/domain";

/** Preset di respirazione riutilizzabili; in alternativa si passano frasi libere. */
export type BreathPreset = "standard" | "forza" | "isometrico" | "cardio" | "mobilita";

export interface ExerciseSeed {
  slug: string;
  name: string;
  nameEn?: string;
  primary: MuscleGroup;
  secondary: Muscle[];
  equipment: Equipment;
  level: Level;
  type: ExerciseType;
  /** Posizione di partenza. */
  start: string[];
  /** Esecuzione del movimento. */
  exec: string[];
  /** Posizione finale / ritorno. */
  end: string[];
  breath?: BreathPreset | string[];
  mistakes: string[];
  safety: string[];
  /** Slug di altri esercizi o testo libero. */
  easier: string[];
  harder: string[];
  /** Id della cartella immagini in free-exercise-db (se esiste). */
  src?: string;
}

export const BREATH_PRESETS: Record<BreathPreset, string[]> = {
  standard: [
    "Inspira durante la fase di ritorno controllato (eccentrica).",
    "Espira durante la fase di sforzo (concentrica), senza svuotare del tutto i polmoni.",
  ],
  forza: [
    "Prima di ogni ripetizione inspira profondamente “nella pancia” e contrai l'addome come se dovessi ricevere un colpo.",
    "Mantieni la pressione durante la discesa e il punto più duro; espira solo dopo averlo superato o a fine ripetizione.",
  ],
  isometrico: [
    "Respira in modo corto e regolare, senza mai trattenere il fiato.",
    "A ogni espirazione cerca di aumentare leggermente la tensione addominale.",
  ],
  cardio: [
    "Respira in modo ritmico, sincronizzando il respiro con il movimento.",
    "Usa il “test della parola”: se riesci a dire solo poche parole stai lavorando ad alta intensità.",
  ],
  mobilita: [
    "Respira lentamente con il diaframma, senza fretta.",
    "A ogni espirazione rilascia un po' di tensione e aumenta di poco l'ampiezza.",
  ],
};
