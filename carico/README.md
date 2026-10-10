# Carico — schede di allenamento

Web app per creare, salvare ed eseguire schede di allenamento in palestra. Pensata per il telefono (una mano sola, bottoni grandi, navigazione in basso), con layout a due colonne su desktop. Interfaccia interamente in italiano, dati salvati in locale in SQLite.

- **Libreria di 193 esercizi** su 14 gruppi muscolari, con spiegazione a passi numerati (partenza, esecuzione, posizione finale, respirazione), errori comuni, sicurezza, varianti più facili/difficili e foto di partenza e fine.
- **Esercizi personalizzati** con note e foto caricata (anche scattata dal telefono), **preferiti** e note personali su ogni esercizio.
- **Costruttore di schede** a giorni, con serie, range di ripetizioni, carico, recupero, tempo, note e superset; **drag and drop** (mouse, touch e tastiera) per riordinare giorni ed esercizi.
- **5 template** (Full Body 3x, Push/Pull/Legs, Upper/Lower, Split 4 giorni, Principiante) e **generatore automatico** in base a obiettivo, livello, giorni e attrezzatura.
- **Modalità allenamento**: spunti ogni serie con peso e ripetizioni reali, timer di recupero automatico con vibrazione e suono, riferimento all'ultima sessione e carico suggerito (doppia progressione). Lo stato è salvato sul telefono a ogni tocco: se ricarichi la pagina o perdi la connessione non perdi nulla.
- **Storico** e **grafico di progressione** per esercizio (1RM stimato, carico massimo, volume, ripetizioni).
- **PDF / stampa** con layout A4 pulito (con o senza immagini, colonne per annotare i carichi), **condivisione via link**, **import/export JSON**.
- **Impostazioni**: tema chiaro/scuro/automatico, kg/lb, **backup e ripristino** completi.
- **PWA installabile** con funzionamento offline delle pagine già visitate.

## Avvio

Requisiti: Node.js 20 o superiore.

```bash
cd carico
npm install
npm run dev
```

Apri <http://localhost:3000>. Al primo avvio il database `prisma/dev.db` viene creato e popolato in automatico (script `scripts/ensure-db.mjs`). Non servono servizi esterni né chiavi.

Versione di produzione (più veloce, con service worker attivo):

```bash
npm run build
npm start
```

### Usarla dal telefono in palestra

1. Avvia il server sul computer rendendolo visibile in rete locale: `npm start -- -H 0.0.0.0` (oppure `npm run dev -- -H 0.0.0.0`).
2. Dal telefono, sulla stessa Wi-Fi, apri `http://<IP-del-computer>:3000`.
3. Aggiungi l'app alla schermata Home (Safari: Condividi → Aggiungi alla schermata Home; Chrome: ⋮ → Installa app).

Nota: i browser abilitano service worker e installazione completa solo su `localhost` o in HTTPS. In rete locale l'app funziona comunque; per l'uso offline vero e proprio pubblicala dietro HTTPS (per esempio con un tunnel come Cloudflare Tunnel o su un piccolo server con certificato).

### Comandi utili

| Comando | Cosa fa |
| --- | --- |
| `npm run dev` | Server di sviluppo (crea il DB se manca) |
| `npm run build` / `npm start` | Build e avvio in produzione |
| `npm test` | Test (Vitest) |
| `npm run lint` / `npm run typecheck` | ESLint e TypeScript |
| `npm run db:seed` | Aggiorna gli esercizi dal seed (non tocca schede, storico, preferiti) |
| `npm run db:reset` | Cancella **tutto** e ricrea il database da zero |
| `npm run images:fetch` | Riscarica le immagini da free-exercise-db (`-- --force` per sovrascrivere) |

## Scelte tecniche

- **Next.js 16 (App Router) + React 19 + TypeScript strict.** Le pagine sono Server Component che leggono direttamente dal DB; le mutazioni passano da Server Actions validate con **Zod**. I componenti interattivi (costruttore, allenamento, filtri) sono Client Component.
- **SQLite + Prisma 6.** Le liste (passi, errori, immagini…) sono colonne JSON, perché SQLite non ha array; la conversione tipizzata è in `src/lib/exercise.ts`. I carichi sono sempre salvati in **kg** e convertiti a video.
- **Tailwind CSS 4** con token di colore in CSS (`src/app/globals.css`) per tema chiaro e scuro; nessuna libreria di componenti. Icone, mappa muscolare e grafici sono SVG scritti a mano, quindi nessuna dipendenza pesante.
- **dnd-kit** per il drag and drop: funziona con touch (pressione breve sulla maniglia), mouse e tastiera.
- **Formato portabile delle schede**: gli esercizi sono referenziati per *slug*, così template, generatore, file JSON e link condivisi funzionano su qualsiasi installazione. Il link di condivisione contiene la scheda compressa nel frammento `#…`, che non viene mai inviato al server.
- **PDF tramite stampa del browser** (`/stampa/[id]`, CSS `@page A4`): niente librerie di generazione PDF, testo selezionabile e risultato identico su desktop e telefono.
- **Preferenze del dispositivo** (tema, unità) in `localStorage`, lette con `useSyncExternalStore` per un'idratazione senza discrepanze; sono comunque incluse nel backup.

## Struttura del progetto

```
carico/
├─ prisma/
│  ├─ schema.prisma          # modelli: Exercise, Media, Plan, PlanDay, PlanItem, WorkoutSession, WorkoutSet
│  ├─ seed.ts                # popola/aggiorna gli esercizi (idempotente)
│  └─ data/                  # contenuti degli esercizi, un file per area del corpo
├─ public/
│  ├─ exercises/<slug>/      # immagini degli esercizi (0.webp = partenza, 1.webp = fine)
│  ├─ icons/                 # icone PWA
│  └─ sw.js                  # service worker
├─ scripts/
│  ├─ ensure-db.mjs          # crea il DB al primo avvio
│  └─ fetch-images.ts        # scarica e ridimensiona le immagini
└─ src/
   ├─ app/
   │  ├─ (app)/              # pagine con navigazione: oggi, esercizi, schede, allenamento, storico, impostazioni
   │  ├─ (print)/stampa/     # versione stampabile / PDF
   │  ├─ api/                # export JSON, backup, immagini caricate
   │  └─ manifest.ts         # manifest PWA
   ├─ components/            # UI riutilizzabile, costruttore (builder/), modalità allenamento (workout/)
   └─ lib/
      ├─ domain.ts           # vocabolario: gruppi muscolari, attrezzi, livelli… con etichette italiane
      ├─ generator.ts        # generatore automatico di schede (puro, testato)
      ├─ progression.ts      # 1RM, volume, record, suggerimento carico (puro, testato)
      ├─ templates.ts        # template pronti
      ├─ plan-schema.ts      # validazione Zod di schede e file esportati
      ├─ share.ts            # codifica dei link di condivisione
      ├─ queries.ts          # letture dal DB
      └─ actions/            # Server Actions (schede, esercizi, allenamenti, backup)
```

## Aggiungere o modificare esercizi

**Dall'app:** Esercizi → *Nuovo*. Puoi caricare una foto e scrivere passi, errori e varianti (una voce per riga). Gli esercizi personalizzati sono inclusi in backup ed export.

**Nel database di base** (per tutti, versionato nel codice):

1. Aggiungi un oggetto all'array del gruppo giusto in `prisma/data/*.ts`:

   ```ts
   {
     slug: "pressa-orizzontale",            // univoco, minuscolo con trattini
     name: "Pressa orizzontale",
     nameEn: "Horizontal Leg Press",
     primary: "quadricipiti",               // uno dei 14 gruppi di src/lib/domain.ts
     secondary: ["glutei"],
     equipment: "macchinario",
     level: "principiante",
     type: "multiarticolare",
     start: ["…"], exec: ["…"], end: ["…"],
     breath: "standard",                    // preset (standard, forza, isometrico, cardio, mobilita) o frasi libere
     mistakes: ["…", "…", "…"],
     safety: ["…"],
     easier: ["leg-press"],                 // slug di un altro esercizio (diventa un link) o testo libero
     harder: ["squat-bilanciere"],
     src: "Leg_Press",                      // facoltativo: cartella immagini su free-exercise-db
   }
   ```

2. Immagini: metti `0.webp` (partenza) e `1.webp` (fine) in `public/exercises/<slug>/` — vanno bene anche `.jpg`, `.png`, `.svg`. Se hai indicato `src`, `npm run images:fetch` le scarica e ridimensiona da sé. Senza immagini l'app mostra una mappa muscolare generata.
3. `npm run db:seed` per aggiornare il database e `npm test` per verificare slug duplicati o varianti che puntano a esercizi inesistenti.

**Sostituire le immagini:** basta rimpiazzare i file nella cartella dell'esercizio e rilanciare `npm run db:seed`. Tutte le immagini passano dal componente `src/components/exercise-image.tsx`, l'unico punto da toccare per cambiare strategia (CDN, formato, illustrazioni).

## Test

```bash
npm test
```

Coprono il generatore di schede (split, livello, attrezzatura, bilanciamento, determinismo, superset/cardio), i calcoli di progressione (1RM, volume, record, doppia progressione), la validazione delle schede, i template, la ricerca, le unità di misura, i link di condivisione e la coerenza del database esercizi (≥150 voci, slug univoci, varianti valide).

## Crediti e licenze

- Foto degli esercizi: [free-exercise-db](https://github.com/yuhonas/free-exercise-db) di yuhonas, rilasciato nel **pubblico dominio** con licenza [Unlicense](https://unlicense.org). Le immagini sono state ridimensionate e convertite in WebP.
- Testi in italiano, mappe muscolari, icone e grafica sono originali di questo progetto.
- Le indicazioni hanno scopo informativo e non sostituiscono il parere di un medico o di un professionista qualificato.
