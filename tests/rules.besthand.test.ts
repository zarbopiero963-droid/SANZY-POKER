/**
 * Regolamento §4 — vincoli di composizione delle combinazioni.
 * Piatto 1: da 1 a 4 carte personali + carte del Piatto 1, oppure "punto in mano"
 *           (tutte e 5 le personali). MAI 5 carte dal tavolo.
 * Piatto 2: 3 o 4 carte personali + le carte del Piatto 2, oppure punto in mano.
 * I due piatti non si mischiano mai.
 */
import { describe, expect, it } from "vitest";
import {
  CATS,
  bestPot1Hand,
  bestPot2Hand,
  type Variant,
} from "../client/src/game/rules";

const VARIANTS: Variant[] = ["standard", "hilow"];

describe("Piatto 1 — vincoli", () => {
  for (const variant of VARIANTS) {
    it(`(${variant}) non si può usare il tavolo da solo: serve almeno 1 carta personale`, () => {
      // Sul tavolo c'è una scala reale di cuori completa: non è utilizzabile in blocco.
      const board1 = ["AH", "KH", "QH", "JH", "10H", "7S"];
      const personal = ["7D", "8C", "9S", "QD", "KC"];
      const best = bestPot1Hand(personal, board1, variant);
      // Il meglio raggiungibile con >=1 personale è la scala massima mista
      // (KC+QD personali + AH JH 10H dal tavolo), non la scala reale di colore.
      expect(best.category).toBe(CATS.STRAIGHT);
      expect(best.level).toBe(3);
    });

    it(`(${variant}) punto in mano: 5 carte personali senza toccare il tavolo`, () => {
      const personal = ["JC", "10C", "9C", "8C", "7C"]; // scala media di fiori in mano
      const board1 = ["AH", "KD", "QS", "7H", "8D", "9S"];
      const best = bestPot1Hand(personal, board1, variant);
      expect(best.category).toBe(CATS.STRAIGHT_FLUSH);
      expect(best.level).toBe(2);
      expect(best.suit).toBe("C");
    });

    it(`(${variant}) con 6 carte a tavolo e 5 personali esiste SEMPRE almeno una coppia nel Piatto 1`, () => {
      // Fatto matematico: 8 valori totali; o il tavolo contiene una coppia
      // (usabile con 1 personale) o copre 6 valori distinti e per pigeonhole
      // una personale duplica un valore del tavolo o le personali si accoppiano tra loro.
      // Il caso "nessuna combinazione nel Piatto 1" del regolamento è quindi irrealizzabile.
      const worstBoards = [
        ["7H", "8D", "9C", "10S", "JH", "QD"],
        ["AH", "KD", "QC", "JS", "10H", "9D"],
        ["7S", "7D", "AC", "KS", "10D", "8H"],
      ];
      const worstPersonals = [
        ["KH", "AC", "7C", "8S", "9H"],
        ["7C", "8S", "AD", "AS", "KC"],
        ["9S", "JC", "QH", "KH", "AD"],
      ];
      for (const board of worstBoards) {
        for (const personal of worstPersonals) {
          const used = new Set([...board, ...personal]);
          if (used.size !== 11) continue; // salta gli incroci con carte duplicate
          const best = bestPot1Hand(personal, board, "standard");
          expect(best.category).toBeGreaterThanOrEqual(CATS.PAIR);
        }
      }
    });
  }
});

describe("Piatto 2 — vincoli", () => {
  for (const variant of VARIANTS) {
    it(`(${variant}) 3 personali + 2 carte del Piatto 2: la coppia del tavolo è utilizzabile`, () => {
      const personal = ["KC", "QD", "9S", "8H", "7C"];
      const board2 = ["AH", "AD"];
      const best = bestPot2Hand(personal, board2, variant);
      expect(best.category).toBe(CATS.PAIR);
      expect(best.rank).toBe(7); // valore dell'Asso
    });

    it(`(${variant}) 3 personali + 2 del tavolo permettono anche il poker`, () => {
      const personal = ["AS", "AC", "KD", "QH", "9C"];
      const board2 = ["AH", "AD"];
      const best = bestPot2Hand(personal, board2, variant);
      expect(best.category).toBe(CATS.QUADS);
    });

    it(`(${variant}) punto in mano valido anche per il Piatto 2`, () => {
      const personal = ["KH", "KD", "KC", "QH", "QD"]; // full in mano
      const board2 = ["7S", "8S"];
      const best = bestPot2Hand(personal, board2, variant);
      expect(best.category).toBe(CATS.FULL_HOUSE);
    });

    it(`(${variant}) con il Piatto 2 coperto vale solo il punto in mano`, () => {
      const personal = ["AH", "AD", "9S", "8C", "7H"];
      const best = bestPot2Hand(personal, [], variant);
      expect(best.category).toBe(CATS.PAIR);
      expect(best.rank).toBe(7);
    });

    it(`(${variant}) il Piatto 2 non vede mai le carte del Piatto 1`, () => {
      // Gli assi del Piatto 1 non possono trasformare la coppia del Piatto 2 in tris/poker.
      const personal = ["KC", "QD", "JS", "9H", "8D"];
      const board1 = ["AH", "AD", "10S", "9C", "8S", "7D"];
      const board2 = ["AS", "AC"];
      const bestPot2 = bestPot2Hand(personal, board2, variant);
      expect(bestPot2.category).toBe(CATS.PAIR); // solo coppia d'assi, mai tris o poker
      const bestPot1 = bestPot1Hand(personal, board1, variant);
      expect(bestPot1.category).toBeLessThan(CATS.QUADS); // niente poker d'assi incrociato
    });
  }
});
