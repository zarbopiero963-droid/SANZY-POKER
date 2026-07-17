/**
 * Regolamento §1 e §5 — riconoscimento delle combinazioni e gerarchia dei punteggi.
 * Gerarchia Sanzy: scala colore > poker > COLORE > FULL > scala > tris > doppia coppia > coppia.
 * (Nel Sanzy il colore batte il full, al contrario del poker classico.)
 */
import { describe, expect, it } from "vitest";
import {
  CATS,
  compareHands,
  evaluateHand,
  type Variant,
} from "../client/src/game/rules";

const VARIANTS: Variant[] = ["standard", "hilow"];

describe("evaluateHand — riconoscimento combinazioni", () => {
  it("rifiuta mani che non hanno esattamente 5 carte", () => {
    expect(() => evaluateHand(["AH", "KH", "QH", "JH"])).toThrow();
    expect(() => evaluateHand(["AH", "KH", "QH", "JH", "10H", "9H"])).toThrow();
  });

  it("scala massima di colore: A-K-Q-J-10 dello stesso seme (livello 3)", () => {
    const hand = evaluateHand(["AH", "KH", "QH", "JH", "10H"]);
    expect(hand.category).toBe(CATS.STRAIGHT_FLUSH);
    expect(hand.level).toBe(3);
    expect(hand.suit).toBe("H");
  });

  it("scale medie di colore: K-Q-J-10-9, Q-J-10-9-8, J-10-9-8-7 (livello 2)", () => {
    const media1 = evaluateHand(["KS", "QS", "JS", "10S", "9S"]);
    const media2 = evaluateHand(["QD", "JD", "10D", "9D", "8D"]);
    const media3 = evaluateHand(["JC", "10C", "9C", "8C", "7C"]);
    for (const hand of [media1, media2, media3]) {
      expect(hand.category).toBe(CATS.STRAIGHT_FLUSH);
      expect(hand.level).toBe(2);
    }
  });

  it("scala minima di colore: 10-9-8-7-A con Asso basso (livello 1)", () => {
    const hand = evaluateHand(["10H", "9H", "8H", "7H", "AH"]);
    expect(hand.category).toBe(CATS.STRAIGHT_FLUSH);
    expect(hand.level).toBe(1);
  });

  it("scala minima anche a semi misti: 10-9-8-7-A è una scala (livello 1)", () => {
    const hand = evaluateHand(["10H", "9S", "8D", "7C", "AH"]);
    expect(hand.category).toBe(CATS.STRAIGHT);
    expect(hand.level).toBe(1);
  });

  it("A-K-Q-J-9 e simili NON sono scale", () => {
    expect(evaluateHand(["AH", "KS", "QD", "JC", "9H"]).category).toBe(
      CATS.HIGH
    );
    expect(evaluateHand(["KH", "QS", "JD", "9C", "8H"]).category).toBe(
      CATS.HIGH
    );
    // L'Asso non fa da ponte: Q-K-A-7-8 non è una scala.
    expect(evaluateHand(["QH", "KS", "AD", "7C", "8H"]).category).toBe(
      CATS.HIGH
    );
  });

  it("poker, colore, full, tris, doppia coppia, coppia, carta alta", () => {
    expect(evaluateHand(["AH", "AS", "AD", "AC", "KH"]).category).toBe(
      CATS.QUADS
    );
    expect(evaluateHand(["AH", "KH", "9H", "8H", "7H"]).category).toBe(
      CATS.FLUSH
    );
    expect(evaluateHand(["KH", "KS", "KD", "QH", "QS"]).category).toBe(
      CATS.FULL_HOUSE
    );
    expect(evaluateHand(["KH", "QS", "JD", "10C", "9H"]).category).toBe(
      CATS.STRAIGHT
    );
    expect(evaluateHand(["KH", "KS", "KD", "QH", "JS"]).category).toBe(
      CATS.TRIPS
    );
    expect(evaluateHand(["KH", "KS", "QD", "QH", "JS"]).category).toBe(
      CATS.TWO_PAIR
    );
    expect(evaluateHand(["KH", "KS", "QD", "JH", "10S"]).category).toBe(
      CATS.PAIR
    );
    expect(evaluateHand(["KH", "QS", "10D", "9H", "7S"]).category).toBe(
      CATS.HIGH
    );
  });
});

describe("gerarchia §5 — ogni categoria batte la successiva, in entrambe le varianti", () => {
  // Mani rappresentative in ordine gerarchico decrescente.
  const ladder = [
    { name: "scala minima di colore", cards: ["10H", "9H", "8H", "7H", "AH"] },
    { name: "poker di assi", cards: ["AS", "AD", "AC", "AH", "KH"] },
    { name: "colore", cards: ["KS", "QS", "9S", "8S", "7S"] },
    { name: "full", cards: ["KH", "KD", "KC", "QH", "QD"] },
    { name: "scala massima", cards: ["AH", "KS", "QD", "JC", "10H"] },
    { name: "tris", cards: ["QS", "QC", "QD", "JH", "9S"] },
    { name: "doppia coppia", cards: ["JS", "JD", "10S", "10C", "8H"] },
    { name: "coppia", cards: ["9H", "9C", "KC", "8S", "7C"] },
    { name: "carta alta", cards: ["AH", "QH", "10S", "8D", "7H"] },
  ];

  for (const variant of VARIANTS) {
    it(`variante ${variant}: la gerarchia completa è rispettata`, () => {
      const evaluations = ladder.map(entry => evaluateHand(entry.cards));
      for (let strong = 0; strong < evaluations.length; strong += 1) {
        for (let weak = strong + 1; weak < evaluations.length; weak += 1) {
          expect(
            compareHands(evaluations[strong], evaluations[weak], variant),
            `${ladder[strong].name} deve battere ${ladder[weak].name} (${variant})`
          ).toBeGreaterThan(0);
        }
      }
    });
  }

  for (const variant of VARIANTS) {
    it(`variante ${variant}: anche la scala colore MINIMA batte il poker di assi`, () => {
      const minima = evaluateHand(["10S", "9S", "8S", "7S", "AS"]);
      const pokerAssi = evaluateHand(["AH", "AD", "AC", "AS", "KH"]);
      expect(minima.category).toBe(CATS.STRAIGHT_FLUSH);
      expect(pokerAssi.category).toBe(CATS.QUADS);
      expect(compareHands(minima, pokerAssi, variant)).toBeGreaterThan(0);
    });
  }

  for (const variant of VARIANTS) {
    it(`variante ${variant}: il colore batte il full (regola speciale Sanzy)`, () => {
      const colore = evaluateHand(["KS", "JS", "9S", "8S", "7S"]);
      const full = evaluateHand(["AH", "AD", "AC", "KH", "KD"]);
      expect(colore.category).toBe(CATS.FLUSH);
      expect(full.category).toBe(CATS.FULL_HOUSE);
      expect(compareHands(colore, full, variant)).toBeGreaterThan(0);
    });
  }
});
