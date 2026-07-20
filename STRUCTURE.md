# Struttura prevista

| Percorso                                  | Responsabilità                                                             |
| ----------------------------------------- | -------------------------------------------------------------------------- |
| `client/src/pages/Home.tsx`               | Gate B2B: landing → NDA → sblocco → (lingua → variante) → canvas + timer   |
| `client/src/business/BusinessLanding.tsx` | Homepage B2B: slogan, pitch, CTA "Prova la demo", toggle IT/EN             |
| `client/src/business/NdaDialog.tsx`       | Popup NDA click-wrap a 3 slide + schermata di sblocco con password         |
| `client/src/business/DemoTimer.tsx`       | Overlay timer demo 15' (dipende da `startedAt`: non riparte al refresh)    |
| `client/src/business/DemoExpired.tsx`     | Schermata di blocco a demo scaduta                                         |
| `client/src/business/demoSession.ts`      | Logica pura: validazione modulo, password, payload NDA, timer, persistenza |
| `client/src/business/landingI18n.ts`      | i18n IT/EN della sezione business (`tb()`), separato dall'i18n del gioco   |
| `client/src/business/ndaService.ts`       | `submitNda()` — stub del contratto `POST /api/nda/sign` (backend nel PR2)  |
| `client/src/components/StartScreen.tsx`   | Selettore lingua e schermata logo + pulsanti Standard/Hi-Low               |
| `client/src/components/SanzyLogo.tsx`     | Logo Sanzy Poker vettoriale (SVG) ricostruito dal marchio originale        |
| `client/src/components/GameCanvas.tsx`    | Ciclo di vita del motore grafico e canvas full-screen (prop `variant`)     |
| `client/src/game/i18n.ts`                 | Dizionari IT/EN/ES/FR, `t()`, `describeHand()`, `formatChips()`            |
| `client/src/game/scene.ts`                | Creazione scena (accetta la variante), regia tavolo e smaltimento          |
| `client/src/game/rules.ts`                | Mazzo, combinazioni, confronto Standard/Hi-Low (label IT canonica)         |
| `client/src/game/state.ts`                | Stato tavolo, fasi, azioni e regola split 50/50 per piatto                 |
| `client/src/game/bots.ts`                 | Decisioni e personalità dei bot                                            |
| `client/src/game/ui.ts`                   | Costruzione HUD, sedute, carte e controlli (testi via `t()`)               |
| `client/src/game/viewSignature.ts`        | Firma pura dello stato visibile: render-gate anti-flicker dell'HUD         |
| `client/src/game/anim.ts`                 | Helper puri di animazione (pulsazione bordo attivo) usati da `tick()`      |

**Confine architetturale:** React ospita il flusso d'ingresso e il canvas; regole e gameplay restano classi e funzioni TypeScript indipendenti dal framework. L'i18n è un modulo puro senza logica di gioco: traduce solo le etichette mostrate; la `label` italiana in `rules.ts` resta la forma canonica usata dai test, mentre il rendering usa `describeHand()`.

**Sezione business (demo B2B con NDA, idea #12 · tracking #26).** Il modulo `client/src/business/**` aggiunge, _davanti_ al gioco, un imbuto commerciale: landing → popup NDA a 3 slide (click-wrap) → schermata di sblocco con password di sessione → gioco con timer demo di 15'. Vincoli: **non tocca il motore** (regole, stato, showdown, mazzo, fasi restano identici); la logica pura (validazione, password, payload NDA, timer) sta in `demoSession.ts` ed è coperta da test offline; l'i18n business è **IT/EN** e **separato** da quello del gioco (che resta a 4 lingue, così il test di completezza non si rompe — eccezione documentata). Il timer dipende solo da `startedAt` (salvato in `localStorage` alla firma) quindi **non riparte al refresh**. `ndaService.submitNda()` è per ora uno **stub** del contratto `POST /api/nda/sign`: generazione PDF, log IP/timestamp e invio email a pier.zar69@gmail.com via Resend arrivano nel **PR2** (nessun segreto nel repo).
