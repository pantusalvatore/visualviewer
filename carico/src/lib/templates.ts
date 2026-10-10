/** Template di schede pronti all'uso. Gli esercizi sono referenziati per slug. */
import type { PlanDraft, PlanItemDraft } from "./plan-schema";

export interface PlanTemplate {
  id: string;
  title: string;
  description: string;
  plan: PlanDraft;
}

/** Scorciatoia per scrivere un esercizio: slug, serie, "min-max" ripetizioni, recupero in secondi. */
function ex(slug: string, sets: number, reps: string, rest: number, extra: Partial<PlanItemDraft> = {}): PlanItemDraft {
  const [min, max] = reps.split("-").map(Number);
  return {
    exerciseSlug: slug,
    sets,
    repsMin: min!,
    repsMax: max ?? min!,
    restSeconds: rest,
    load: null,
    tempo: null,
    notes: null,
    superset: null,
    ...extra,
  };
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: "full-body-3x",
    title: "Full Body 3x",
    description: "Tre allenamenti a settimana che coinvolgono tutto il corpo. Equilibrato e facile da recuperare.",
    plan: {
      name: "Full Body 3x",
      goal: "ipertrofia",
      level: "intermedio",
      daysPerWeek: 3,
      notes: "Alterna i giorni A, B e C lasciando almeno un giorno di riposo tra le sedute.",
      days: [
        {
          name: "A · Full body",
          items: [
            ex("squat-bilanciere", 4, "6-8", 150),
            ex("panca-piana-bilanciere", 4, "6-8", 150),
            ex("rematore-bilanciere", 3, "8-10", 120),
            ex("alzate-laterali", 3, "12-15", 60),
            ex("plank", 3, "30-45", 45, { notes: "Ripetizioni = secondi di tenuta" }),
          ],
        },
        {
          name: "B · Full body",
          items: [
            ex("stacco-da-terra", 3, "5-6", 180),
            ex("lento-manubri-seduto", 3, "8-10", 120),
            ex("lat-machine-avanti", 3, "8-12", 90),
            ex("affondi-manubri", 3, "10-12", 90),
            ex("curl-manubri-alternato", 3, "10-12", 60, { superset: "A" }),
            ex("pushdown-corda", 3, "10-12", 60, { superset: "A" }),
          ],
        },
        {
          name: "C · Full body",
          items: [
            ex("leg-press", 4, "10-12", 120),
            ex("panca-inclinata-manubri", 3, "8-10", 120),
            ex("pulley-basso", 3, "10-12", 90),
            ex("hip-thrust-bilanciere", 3, "8-12", 90),
            ex("face-pull", 3, "12-15", 60),
            ex("crunch-cavo", 3, "12-15", 45),
          ],
        },
      ],
    },
  },
  {
    id: "push-pull-legs",
    title: "Push / Pull / Legs",
    description: "Classico split a tre giorni: spinte, tirate e gambe. Ripetibile due volte a settimana per i più avanzati.",
    plan: {
      name: "Push / Pull / Legs",
      goal: "ipertrofia",
      level: "intermedio",
      daysPerWeek: 3,
      notes: "Per una frequenza più alta ripeti il ciclo due volte a settimana (6 giorni).",
      days: [
        {
          name: "Push",
          items: [
            ex("panca-piana-bilanciere", 4, "6-8", 150),
            ex("panca-inclinata-manubri", 3, "8-10", 120),
            ex("lento-manubri-seduto", 3, "8-10", 120),
            ex("alzate-laterali", 4, "12-15", 60),
            ex("croci-ai-cavi", 3, "12-15", 60),
            ex("pushdown-corda", 3, "10-12", 60),
          ],
        },
        {
          name: "Pull",
          items: [
            ex("trazioni-sbarra", 4, "6-10", 150),
            ex("rematore-bilanciere", 4, "8-10", 120),
            ex("pulley-basso", 3, "10-12", 90),
            ex("face-pull", 3, "12-15", 60),
            ex("curl-bilanciere-ez", 3, "8-12", 60),
            ex("curl-martello", 3, "10-12", 60),
          ],
        },
        {
          name: "Legs",
          items: [
            ex("squat-bilanciere", 4, "6-8", 180),
            ex("stacco-rumeno", 3, "8-10", 150),
            ex("leg-press", 3, "10-12", 120),
            ex("leg-curl-seduto", 3, "10-12", 60),
            ex("calf-in-piedi-macchina", 4, "10-15", 60),
            ex("sollevamento-gambe-sbarra", 3, "8-12", 60),
          ],
        },
      ],
    },
  },
  {
    id: "upper-lower",
    title: "Upper / Lower",
    description: "Quattro giorni: due per la parte alta e due per la parte bassa, uno più pesante e uno più voluminoso.",
    plan: {
      name: "Upper / Lower",
      goal: "forza",
      level: "intermedio",
      daysPerWeek: 4,
      notes: "Giorni A più pesanti (forza), giorni B con più ripetizioni (volume).",
      days: [
        {
          name: "Upper A · Forza",
          items: [
            ex("panca-piana-bilanciere", 5, "3-5", 180),
            ex("rematore-bilanciere", 5, "5-6", 150),
            ex("lento-avanti-bilanciere", 3, "5-6", 150),
            ex("trazioni-presa-inversa", 3, "6-8", 120),
            ex("panca-presa-stretta", 3, "6-8", 120),
          ],
        },
        {
          name: "Lower A · Forza",
          items: [
            ex("squat-bilanciere", 5, "3-5", 180),
            ex("stacco-rumeno", 3, "6-8", 150),
            ex("affondi-camminati-bilanciere", 3, "8-10", 120),
            ex("calf-in-piedi-macchina", 4, "8-12", 60),
            ex("ab-wheel", 3, "8-12", 60),
          ],
        },
        {
          name: "Upper B · Volume",
          items: [
            ex("panca-inclinata-manubri", 4, "8-12", 90),
            ex("lat-machine-avanti", 4, "10-12", 90),
            ex("arnold-press", 3, "10-12", 90),
            ex("rematore-manubrio", 3, "10-12", 90),
            ex("curl-panca-inclinata", 3, "10-12", 60, { superset: "A" }),
            ex("french-press-ez", 3, "10-12", 60, { superset: "A" }),
          ],
        },
        {
          name: "Lower B · Volume",
          items: [
            ex("stacco-da-terra", 3, "5-6", 180),
            ex("hack-squat", 3, "10-12", 120),
            ex("hip-thrust-bilanciere", 3, "10-12", 90),
            ex("leg-curl-sdraiato", 3, "10-12", 60),
            ex("calf-seduto", 3, "12-15", 60),
          ],
        },
      ],
    },
  },
  {
    id: "split-4-giorni",
    title: "Split 4 giorni",
    description: "Monofrequenza per distretti: petto e tricipiti, schiena e bicipiti, gambe, spalle e addome.",
    plan: {
      name: "Split 4 giorni",
      goal: "ipertrofia",
      level: "avanzato",
      daysPerWeek: 4,
      notes: "Ogni gruppo muscolare viene allenato una volta a settimana con volume elevato.",
      days: [
        {
          name: "Petto e tricipiti",
          items: [
            ex("panca-piana-bilanciere", 4, "6-8", 150),
            ex("panca-inclinata-manubri", 4, "8-10", 120),
            ex("dip-parallele-petto", 3, "8-12", 90),
            ex("croci-ai-cavi", 3, "12-15", 60),
            ex("french-press-ez", 3, "8-10", 90),
            ex("pushdown-corda", 3, "12-15", 60),
          ],
        },
        {
          name: "Schiena e bicipiti",
          items: [
            ex("stacco-da-terra", 4, "4-6", 180),
            ex("trazioni-sbarra", 4, "6-10", 120),
            ex("t-bar-row", 3, "8-10", 120),
            ex("lat-machine-presa-stretta", 3, "10-12", 90),
            ex("curl-bilanciere", 3, "8-10", 90),
            ex("curl-concentrato", 3, "10-12", 60),
          ],
        },
        {
          name: "Gambe",
          items: [
            ex("squat-bilanciere", 5, "5-8", 180),
            ex("leg-press", 4, "10-12", 120),
            ex("split-squat-bulgaro", 3, "8-10", 90),
            ex("leg-extension", 3, "12-15", 60, { superset: "A" }),
            ex("leg-curl-sdraiato", 3, "10-12", 60, { superset: "A" }),
            ex("calf-in-piedi-macchina", 4, "10-15", 60),
          ],
        },
        {
          name: "Spalle e addome",
          items: [
            ex("lento-avanti-bilanciere", 4, "6-8", 150),
            ex("alzate-laterali", 4, "12-15", 60),
            ex("alzate-posteriori", 3, "12-15", 60),
            ex("tirate-al-mento", 3, "10-12", 90),
            ex("scrollate-manubri", 3, "10-15", 60),
            ex("sollevamento-gambe-sbarra", 3, "8-12", 60),
            ex("pallof-press", 3, "10-12", 45),
          ],
        },
      ],
    },
  },
  {
    id: "principiante",
    title: "Scheda principiante",
    description: "Due giorni a settimana, soprattutto macchine e movimenti di base per imparare la tecnica in sicurezza.",
    plan: {
      name: "Primi passi",
      goal: "ipertrofia",
      level: "principiante",
      daysPerWeek: 2,
      notes: "Usa carichi con cui potresti fare 2–3 ripetizioni in più. Aumenta il peso quando completi tutte le serie al massimo delle ripetizioni.",
      days: [
        {
          name: "A · Total body",
          items: [
            ex("leg-press", 3, "10-12", 90),
            ex("chest-press-macchina", 3, "10-12", 90),
            ex("lat-machine-avanti", 3, "10-12", 90),
            ex("shoulder-press-macchina", 2, "10-12", 75),
            ex("leg-curl-seduto", 2, "12-15", 60),
            ex("plank", 3, "20-30", 45, { notes: "Ripetizioni = secondi di tenuta" }),
          ],
        },
        {
          name: "B · Total body",
          items: [
            ex("goblet-squat", 3, "10-12", 90),
            ex("piegamenti-inclinati", 3, "8-12", 75),
            ex("low-row-macchina", 3, "10-12", 90),
            ex("ponte-glutei", 3, "12-15", 60),
            ex("curl-macchina", 2, "12-15", 60, { superset: "A" }),
            ex("macchina-tricipiti", 2, "12-15", 60, { superset: "A" }),
            ex("dead-bug", 3, "8-10", 45),
          ],
        },
      ],
    },
  },
];

export function getTemplate(id: string): PlanTemplate | undefined {
  return PLAN_TEMPLATES.find((t) => t.id === id);
}
