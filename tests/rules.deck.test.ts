/**
 * Regolamento §1-§2 — il mazzo Sanzy: 32 carte, 8 valori (7…A) × 4 semi.
 */
import { describe, expect, it } from "vitest";
import { RANKS, SUITS, cardParts, freshDeck, shuffle } from "../client/src/game/rules";

describe("mazzo Sanzy (32 carte)", () => {
  it("contiene esattamente 32 carte tutte diverse", () => {
    const deck = freshDeck();
    expect(deck).toHaveLength(32);
    expect(new Set(deck).size).toBe(32);
  });

  it("copre tutti gli 8 valori per ciascuno dei 4 semi", () => {
    const deck = freshDeck();
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        expect(deck).toContain(`${rank}${suit}`);
      }
    }
  });

  it("ordina i valori 7 < 8 < 9 < 10 < J < Q < K < A", () => {
    const values = RANKS.map((rank) => cardParts(`${rank}H`).value);
    for (let index = 1; index < values.length; index += 1) {
      expect(values[index]).toBeGreaterThan(values[index - 1]);
    }
    expect(cardParts("7S").value).toBe(0);
    expect(cardParts("AS").value).toBe(7);
  });

  it("riconosce valore e seme anche per il 10 (rango a due cifre)", () => {
    const card = cardParts("10D");
    expect(card.rank).toBe("10");
    expect(card.suit).toBe("D");
    expect(card.red).toBe(true);
    expect(cardParts("10S").red).toBe(false);
  });

  it("shuffle è una permutazione: stesse carte, nessuna persa o duplicata", () => {
    const deck = freshDeck();
    let state = 42;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
    const shuffled = shuffle(deck, random);
    expect(shuffled).toHaveLength(32);
    expect([...shuffled].sort()).toEqual([...deck].sort());
    expect(deck).toEqual(freshDeck()); // l'input non viene mutato
  });
});
