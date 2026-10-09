# visualviewer

Visualizzatore audio reattivo che gira nel browser. Carichi un brano **.aif / .aiff** o **.mp3** e lo schermo si colora e disegna in tempo reale seguendo frequenze, ritmo e timbro.

## Uso

Apri `index.html` nel browser (doppio clic va bene: niente build, niente server). Se preferisci servirlo:

```bash
npx serve .
```

Trascina un file sulla pagina o premi **Scegli un file**. Il file non lascia mai il tuo computer.

Formati: AIFF/AIFF-C (PCM 8/16/24/32 bit, `sowt`, float, µ-law/A-law) sono decodificati da un parser JavaScript incluso, così funzionano anche in Chrome e Firefox, che non leggono gli AIFF da soli. MP3, WAV, FLAC, OGG e M4A passano dal decoder del browser.

## Installarla sul telefono

Visual Viewer è una web app installabile (PWA): una volta pubblicata online ha un'icona propria, si apre a schermo intero e funziona anche senza connessione.

1. Pubblica il sito con GitHub Pages: **Settings → Pages → Deploy from a branch**, branch `main`, cartella `/ (root)`. Dopo un minuto è online su `https://<utente>.github.io/visualviewer/`.
2. Apri quell'indirizzo dal telefono:
   - **iPhone / iPad (Safari)**: tasto Condividi → **Aggiungi alla schermata Home**.
   - **Android (Chrome)**: tocca **Installa l'app** nella pagina iniziale, oppure menu ⋮ → **Installa app**.
3. Su computer (Chrome/Edge) compare l'icona di installazione nella barra degli indirizzi; da installata puoi aprire i file audio con "Apri con → Visual Viewer".

I brani si scelgono dall'app File (iPhone) o dal gestore file (Android). Su iPhone l'audio suona anche con il tasto silenzioso attivo.

Quando modifichi i file dell'app, aumenta `VERSION` in `sw.js`: così i telefoni scaricano la versione nuova invece di quella salvata.

## Scene

| Scena | Cosa fa |
|---|---|
| **Nebula** | Migliaia di particelle in un campo di flusso. L'energia le accelera, i beat le spingono fuori dal centro, gli alti allargano le scie. |
| **Bloom** | Un mandala simmetrico costruito dallo spettro, con onde ad anello sui beat e scintille sulle alte frequenze. |
| **Ridges** | Le linee dello spettro impilate nel tempo, in stile *Unknown Pleasures*. |
| **Aura** | Nuvole di colore liquide (una per banda) e una forma d'onda che lascia una scia. |

**Auto** cambia scena da sola su un beat forte, circa ogni 20 secondi.

## Feature estratte

- **Bande**: bassi (20–140 Hz), medio-bassi, medi, alti (2.5–11 kHz), con un controllo automatico del guadagno che si adatta al brano
- **Energia**: RMS della forma d'onda
- **Brillantezza**: centroide spettrale, che sposta la palette verso colori diversi quando il suono si fa più brillante
- **Beat/onset**: spectral flux pesato sui bassi, con una soglia adattiva (media + k·deviazione standard)
- **BPM**: stimato dagli intervalli tra gli onset degli ultimi 10 secondi

Lo slider **Sensibilità** regola sia l'intensità del visual sia la soglia del rilevamento dei beat.

## Scorciatoie

| Tasto | Azione |
|---|---|
| `Spazio` / clic sul visual | Play / pausa |
| `1`–`4` | Cambia scena |
| `A` | Modalità auto |
| `P` | Palette successiva |
| `H` | Mostra/nascondi il pannello di analisi |
| `F` | Schermo intero |
| `R` | Registra un video (.webm) con l'audio |
| `O` | Apri un altro brano |
| `←` / `→` | Indietro / avanti di 5 s |

## Struttura

```
index.html
css/style.css
js/aiff.js      decoder AIFF / AIFF-C
js/player.js    riproduzione con Web Audio
js/features.js  analisi audio in tempo reale
js/scenes.js    palette e scene (Canvas 2D)
js/app.js       interfaccia e loop di rendering
manifest.webmanifest, sw.js, icons/   app installabile e offline
```

Per aggiungere una scena, crea un oggetto con `enter(s)` e `draw(g, f, s)` in `js/scenes.js` e aggiungilo a `VV.SCENES`.
