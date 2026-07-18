# Memory

- Il regolamento ufficiale usa 32 carte, 6 carte personali, Piatto 1 da 6 carte e Piatto 2 da 2 carte.
- La versione richiesta conserva la fase extra di scarto già presente nel prototipo.
- Divisione del piatto (regola definitiva confermata dall’autore): il totale vale 100, Piatto 1 = 50 e Piatto 2 = 50. Ogni metà è divisa in parti uguali tra i vincitori (o pareggianti) di quel piatto, in modo indipendente; chi vince entrambi da solo prende il 100%. Nell’heads-up a 2 giocatori questo produce comunque l’effettivo 750/250. (La vecchia formula 75/25 per 3-4 giocatori è stata scartata perché contraddiceva "ogni piatto vale 50".)
- La lobby deve mostrare bot effettivamente attivi e tavoli con stato di gioco percepibile.
- Flusso d'ingresso (scelta dell'autore): all'apertura dell'URL si sceglie PRIMA la lingua (IT/EN/ES/FR, default IT), poi compare il logo Sanzy Poker con due pulsanti di variante (Standard / Hi-Low); la variante scelta avvia la partita. Non c'è più la lobby a lista (mai raggiunta nel flusso attuale).
- Internazionalizzazione: `client/src/game/i18n.ts` traduce SOLO le etichette; non tocca regole né matematica. La lingua di default è l'italiano, così le stringhe attese dal motore (es. `Vittoria per fold`) restano invariate e i test restano verdi. `describeHand()` genera i nomi delle mani dai campi strutturati di `HandEvaluation` senza modificare `rules.ts`.
- Logo: `client/src/components/SanzyLogo.tsx` è la ricostruzione vettoriale del tavolo-marchio originale fornito dall'autore (feltro verde ovale, "SANZY" bianco, "POKER" rosso, board dei due piatti 3+2+1 e i due del Piatto 2, quattro semi agli angoli). La grafica 3D del tavolo di gioco resta da migliorare: vedi `HANDOFF-DESIGN.md`.
