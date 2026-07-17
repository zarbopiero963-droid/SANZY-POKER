# Struttura prevista

| Percorso | Responsabilità |
| --- | --- |
| `client/src/components/GameCanvas.tsx` | Ciclo di vita del motore grafico e canvas full-screen |
| `client/src/game/scene.ts` | Creazione scena, regia lobby/tavolo e smaltimento risorse |
| `client/src/game/rules.ts` | Mazzo, combinazioni, confronto Standard/Hi-Low |
| `client/src/game/state.ts` | Stato tavolo, fasi, azioni e regola split 75/25 |
| `client/src/game/bots.ts` | Decisioni e personalità dei bot |
| `client/src/game/ui.ts` | Costruzione HUD, lobby, sedute, carte e controlli |

**Confine architetturale:** React ospita soltanto il canvas; regole e gameplay restano classi e funzioni TypeScript indipendenti dal framework.

