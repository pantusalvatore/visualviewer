import type { Exercise as ExerciseRow } from "@prisma/client";
import {
  EQUIPMENT,
  EXERCISE_TYPES,
  LEVELS,
  MUSCLE_GROUPS,
  isOneOf,
  type Equipment,
  type ExerciseType,
  type Instructions,
  type Level,
  type MuscleGroup,
} from "./domain";
import { parseJson, parseStringArray } from "./json";

/** Esercizio completo, con le colonne JSON già decodificate. */
export interface ExerciseDetail {
  id: string;
  slug: string;
  name: string;
  nameEn: string | null;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: string[];
  equipment: Equipment;
  level: Level;
  type: ExerciseType;
  instructions: Instructions;
  mistakes: string[];
  safety: string[];
  easier: string[];
  harder: string[];
  images: string[];
  imageCredit: string | null;
  isCustom: boolean;
  favorite: boolean;
  notes: string | null;
}

/** Versione leggera usata da liste, filtri e selettori. */
export type ExerciseSummary = Pick<
  ExerciseDetail,
  "id" | "slug" | "name" | "nameEn" | "primaryMuscle" | "secondaryMuscles" | "equipment" | "level" | "type" | "isCustom" | "favorite"
> & { image: string | null };

const EMPTY_INSTRUCTIONS: Instructions = { partenza: [], esecuzione: [], finale: [], respirazione: [] };

export function toExerciseDetail(row: ExerciseRow): ExerciseDetail {
  const instr = parseJson<Partial<Instructions>>(row.instructions, {});
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameEn: row.nameEn,
    primaryMuscle: isOneOf(MUSCLE_GROUPS, row.primaryMuscle) ? row.primaryMuscle : "core",
    secondaryMuscles: parseStringArray(row.secondaryMuscles),
    equipment: isOneOf(EQUIPMENT, row.equipment) ? row.equipment : "altro",
    level: isOneOf(LEVELS, row.level) ? row.level : "principiante",
    type: isOneOf(EXERCISE_TYPES, row.type) ? row.type : "isolamento",
    instructions: { ...EMPTY_INSTRUCTIONS, ...instr },
    mistakes: parseStringArray(row.mistakes),
    safety: parseStringArray(row.safety),
    easier: parseStringArray(row.easier),
    harder: parseStringArray(row.harder),
    images: parseStringArray(row.images),
    imageCredit: row.imageCredit,
    isCustom: row.isCustom,
    favorite: row.favorite,
    notes: row.notes,
  };
}

export function toExerciseSummary(row: ExerciseRow): ExerciseSummary {
  const d = toExerciseDetail(row);
  return {
    id: d.id,
    slug: d.slug,
    name: d.name,
    nameEn: d.nameEn,
    primaryMuscle: d.primaryMuscle,
    secondaryMuscles: d.secondaryMuscles,
    equipment: d.equipment,
    level: d.level,
    type: d.type,
    isCustom: d.isCustom,
    favorite: d.favorite,
    image: d.images[0] ?? null,
  };
}

/** Normalizza un testo per la ricerca: minuscolo, senza accenti. */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

export interface ExerciseFilters {
  q?: string;
  muscle?: MuscleGroup | "";
  equipment?: Equipment | "";
  level?: Level | "";
  type?: ExerciseType | "";
  favorites?: boolean;
}

/** Filtro puro usato dalla libreria (lato client) e dal selettore esercizi. */
export function filterExercises<T extends ExerciseSummary>(list: T[], f: ExerciseFilters): T[] {
  const terms = normalizeSearch(f.q ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return list.filter((e) => {
    if (f.muscle && e.primaryMuscle !== f.muscle) return false;
    if (f.equipment && e.equipment !== f.equipment) return false;
    if (f.level && e.level !== f.level) return false;
    if (f.type && e.type !== f.type) return false;
    if (f.favorites && !e.favorite) return false;
    if (terms.length === 0) return true;
    const haystack = normalizeSearch(
      [e.name, e.nameEn ?? "", e.primaryMuscle, ...e.secondaryMuscles, e.equipment].join(" "),
    );
    return terms.every((t) => haystack.includes(t));
  });
}

/** Una variante può essere uno slug di un altro esercizio o un testo libero. */
export function isSlugLike(value: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(value);
}
