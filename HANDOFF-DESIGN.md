# Handoff design — Sanzy Poker Pro

Documento per un passaggio di **design/grafica** (es. "Claude design"). Obiettivo:
alzare la qualità visiva del gioco **senza toccare la correttezza del motore**.
La logica di gioco è già blindata da test; qui si lavora solo su come le cose
_appaiono e si muovono_.

## 1. Contesto in una riga

Sanzy Poker Pro è un poker a **due piatti** con mazzo da **32 carte**, giocabile
contro bot, in due varianti (**Standard** e **Hi/Low**), reso in **3D con
Babylon.js** dentro un canvas React. Server Express che serve i file statici,
deploy su Railway. Online: `https://sanzy-poker-production.up.railway.app`.

## 2. Cosa è appena stato fatto (stato di partenza per il design)

- **Flusso d'ingresso** nuovo (React): all'apertura dell'URL si sceglie prima la
  **lingua** (IT/EN/ES/FR, default IT), poi compare il **logo Sanzy Poker** con
  due pulsanti di variante **Standard / Hi-Low**; la variante scelta avvia la
  partita. File: `client/src/components/StartScreen.tsx`.
- **Logo** vettoriale `client/src/components/SanzyLogo.tsx` (SVG), ricostruito
  dal marchio originale dell'autore (foto del tavolo-feltro): feltro verde
  ovale, "SANZY" bianco in alto, "POKER" rosso in basso, board dei due piatti
  (fila 3+2+1 e i due del Piatto 2), quattro semi agli angoli.
- **Internazionalizzazione** completa: `client/src/game/i18n.ts` con dizionari
  IT/EN/ES/FR, `t(key, params)`, `formatChips()`, `describeHand()`. Tutta l'UI di
  gioco (`ui.ts`) e i testi dinamici (`state.ts`, `bots.ts`) passano da `t()`.

## 3. Obiettivi di design richiesti dall'autore

1. **La grafica 3D del tavolo non è fluida** → renderla fluida e piacevole
   (animazioni delle carte/fiches, transizioni di fase, luce/feltro, leggibilità
   di valore e seme, resa su mobile e desktop).
2. **Rifinire la schermata d'ingresso** (logo + lingua + varianti): deve sembrare
   la home di un vero client di poker, elegante, non una schermata di prova.
3. **Migliorare ancora il logo** partendo da `SanzyLogo.tsx` mantenendone
   l'identità (vedi §5).

## 4. Riferimenti visivi già in repo (leggere prima di iniziare)

- `ideas.md` — direzione creativa vincolante (palette antracite + feltro verde
  medio + arancio d'azione; tavolo dominante; lobby operativa; movimento breve e
  interrompibile; mobile con camera dedicata sul feltro).
- `reference-analysis.md`, `table-3d-reference.md` — analisi dei riferimenti e
  del tavolo 3D.
- `ASSETS.md` — asset disponibili.
- Screenshot dell'app attuale (chiedere all'autore) mostrano: tavolo ovale, sei
  posizioni Piatto 1 in orizzontale, Piatto 2 verticale a destra, mano del
  giocatore in basso, pannello azioni ancorato in basso.

## 5. Identità del logo (da preservare)

- Testo **SANZY** bianco sopra, **POKER** rosso sotto.
- **Feltro verde ovale** con bordo legno.
- **Board dei due piatti**: fila di 6 sagome (3 Flop + 2 Turn + 1 River) e le 2
  del Piatto 2 impilate a destra — è la firma della variante, va mantenuta.
- **Quattro semi** agli angoli: cuori, picche, fiori, quadri.
- Palette: verde feltro `#1C7A54`, legno `#5A3B2B`, bianco `#F7F5EF`, rosso
  `#D8433F`, accento arancio d'azione `#F49A35` (dal resto della UI).

## 6. VINCOLI NON NEGOZIABILI (non rompere il gioco)

Leggere `CLAUDE.md`/`AGENTS.md`. In sintesi, **non modificare la logica**:

- **Non toccare** `client/src/game/rules.ts` (mazzo 32 carte, combinazioni,
  confronti Standard/Hi-Low, `settleShowdown`) né la matematica dello showdown.
  La conservazione dei gettoni e la regola **50/50 per piatto** sono sacre.
- **Non cambiare** la disposizione vincolante: Piatto 1 orizzontale (3+2+1),
  Piatto 2 verticale a destra, mano del giocatore in basso (vedi `ideas.md`).
- **Non alterare** la sequenza delle fasi (bui → scarto → pre-board → flop →
  turn → river → piatto 2 → showdown) né la coda dei bot in `state.ts`.
- **Non introdurre** testi hardcoded: ogni stringa mostrata deve passare da
  `t()` in `i18n.ts` ed esistere in **tutte e quattro** le lingue (c'è un test di
  completezza che fallisce se manca una chiave).
- **Non rompere** i test: `pnpm check` (tsc) e `pnpm test` (vitest) devono
  restare verdi; la build `pnpm build` deve funzionare (deploy Railway).

## 7. Dove lavorare (e dove NO)

Libero di modificare (design/rendering):

- `client/src/game/scene.ts` — scena Babylon, camera, luci, materiali,
  animazioni delle mesh (carte/fiches/tavolo).
- `client/src/game/ui.ts` — HUD Babylon GUI: layout, colori, tipografia,
  micro-animazioni (i **testi** però solo via `t()`).
- `client/src/components/StartScreen.tsx` e `SanzyLogo.tsx` — schermata
  d'ingresso e logo (CSS inline nel componente `StartScreen`).
- `client/index.html` / CSS globali — font, variabili colore, meta.

Non modificare (motore): `rules.ts`, `state.ts` (salvo etichette via `t()`),
`bots.ts` (salvo etichette), la cartella `tests/`.

## 8. Come usare l'i18n (per non creare testo non tradotto)

```ts
import { t, formatChips, describeHand } from "@/game/i18n";
t("turn.yours"); // "TOCCA A TE" / "YOUR TURN" / …
t("pot.label", { n: formatChips(pot) });
```

Se serve una nuova etichetta: aggiungere la chiave nei **quattro** dizionari
(`IT/EN/ES/FR`) in `i18n.ts`. Il test `tests/i18n.test.ts` verifica che ogni
lingua abbia esattamente le stesse chiavi dell'italiano.

## 9. Come far girare e verificare

```bash
pnpm install --frozen-lockfile
pnpm dev            # sviluppo locale (Vite)
pnpm check          # tsc --noEmit  (deve passare)
pnpm test           # vitest run    (deve passare: 138+ test)
pnpm build          # build di produzione (Babylon/Vite)
```

Verifica reale del rendering 3D: va fatta **nel browser** (Babylon/WebGL,
animazioni, layout mobile/desktop). Documentare i controlli manuali; la logica
pura è già coperta dai test offline.

## 10. Checklist di consegna del design

- [ ] Tavolo 3D fluido (animazioni carte/fiches/fasi, luce e feltro, nessun
      scatto percepibile su mobile).
- [ ] Schermata d'ingresso rifinita (logo + lingua + varianti) da vero client.
- [ ] Logo migliorato mantenendo l'identità (§5).
- [ ] Zero testi hardcoded: tutto via `t()` nelle 4 lingue.
- [ ] `pnpm check`, `pnpm test`, `pnpm build` verdi.
- [ ] Documenti aggiornati se cambia il design (`ideas.md`, `STRUCTURE.md`,
      `todo.md`).
- [ ] Nessuna modifica a regole, matematica, mazzo, fasi, 50/50.
