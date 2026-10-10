import { petto } from "./petto";
import { schiena } from "./schiena";
import { spalle } from "./spalle";
import { avambracci, bicipiti, tricipiti } from "./braccia";
import { femorali, glutei, polpacci, quadricipiti } from "./gambe";
import { addominali, cardio, core, lombari } from "./tronco";
import type { ExerciseSeed } from "./types";

export const exerciseSeeds: ExerciseSeed[] = [
  ...petto,
  ...schiena,
  ...spalle,
  ...bicipiti,
  ...tricipiti,
  ...avambracci,
  ...quadricipiti,
  ...femorali,
  ...glutei,
  ...polpacci,
  ...addominali,
  ...lombari,
  ...core,
  ...cardio,
];

export type { ExerciseSeed } from "./types";
