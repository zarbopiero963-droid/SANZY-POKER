# Struttura prevista

| Percorso                                | Responsabilità                                                         |
| --------------------------------------- | ---------------------------------------------------------------------- |
| `client/src/pages/Home.tsx`             | Flusso d'ingresso (lingua → variante) poi montaggio del canvas         |
| `client/src/components/StartScreen.tsx` | Selettore lingua e schermata logo + pulsanti Standard/Hi-Low           |
| `client/src/components/SanzyLogo.tsx`   | Logo Sanzy Poker vettoriale (SVG) ricostruito dal marchio originale    |
| `client/src/components/GameCanvas.tsx`  | Ciclo di vita del motore grafico e canvas full-screen (prop `variant`) |
| `client/src/game/i18n.ts`               | Dizionari IT/EN/ES/FR, `t()`, `describeHand()`, `formatChips()`        |
| `client/src/game/scene.ts`              | Creazione scena (accetta la variante), regia tavolo e smaltimento      |
| `client/src/game/rules.ts`              | Mazzo, combinazioni, confronto Standard/Hi-Low (label IT canonica)     |
| `client/src/game/state.ts`              | Stato tavolo, fasi, azioni e regola split 50/50 per piatto             |
| `client/src/game/bots.ts`               | Decisioni e personalità dei bot                                        |
| `client/src/game/ui.ts`                 | Costruzione HUD, sedute, carte e controlli (testi via `t()`)           |
| `client/src/game/viewSignature.ts`      | Firma pura dello stato visibile: render-gate anti-flicker dell'HUD     |
| `client/src/game/anim.ts`               | Helper puri di animazione (pulsazione bordo attivo) usati da `tick()`  |

**Confine architetturale:** React ospita il flusso d'ingresso e il canvas; regole e gameplay restano classi e funzioni TypeScript indipendenti dal framework. L'i18n è un modulo puro senza logica di gioco: traduce solo le etichette mostrate; la `label` italiana in `rules.ts` resta la forma canonica usata dai test, mentre il rendering usa `describeHand()`.
