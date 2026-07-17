/**
 * Test matematici hard sull'ordinamento delle mani, per ENTRAMBE le varianti.
 *
 * Per Standard e Hi/Low:
 *  - antisimmetria: cmp(a,b) e cmp(b,a) hanno segno opposto;
 *  - transitività: a ≥ b e b ≥ c ⇒ a ≥ c;
 *  - riflessività: ogni mano pareggia con sé stessa.
 *
 * Specifici per Standard (le parità DIVIDONO, il seme non conta):
 *  - invarianza per permutazione dei semi: rietichettando i semi con una
 *    biiezione la mano ha categoria e valori identici, quindi in Standard
 *    pareggia sempre con l'originale.
 *
 * Specifici per Hi/Low (spareggio di seme):
 *  - oracolo indipendente sul seme di spareggio (seme della carta più alta
 *    della combinazione), ricalcolato qui senza riusare la logica del motore;
 *  - due combinazioni valide (non "carta alta") pareggiano SOLO con firma
 *    completa identica (categoria, valori chiave e seme).
 */
import { describe, expect, it } from "vitest";
import {
  CATS,
  SUIT_PRIORITY,
  cardParts,
  compareHands,
  evaluateHand,
  freshDeck,
  shuffle,
  type CardCode,
  type HandEvaluation,
  type Suit,
  type Variant,
} from "../client/src/game/rules";

const VARIANTS: Variant[] = ["standard", "hilow"];

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function randomHands(count: number, seed: number) {
  const random = lcg(seed);
  const hands: { cards: CardCode[]; ev: HandEvaluation }[] = [];
  for (let index = 0; index < count; index += 1) {
    const cards = shuffle(freshDeck(), random).slice(0, 5);
    hands.push({ cards, ev: evaluateHand(cards) });
  }
  return hands;
}

const HANDS = randomHands(500, 20260718);

describe("Ordinamento delle mani — preordine totale coerente (entrambe le varianti)", () => {
  for (const variant of VARIANTS) {
    it(`(${variant}) antisimmetria: cmp(a,b) e cmp(b,a) hanno segno opposto (125k coppie)`, () => {
      for (let i = 0; i < HANDS.length; i += 1) {
        for (let j = i + 1; j < HANDS.length; j += 1) {
          const ab = Math.sign(compareHands(HANDS[i].ev, HANDS[j].ev, variant));
          const ba = Math.sign(compareHands(HANDS[j].ev, HANDS[i].ev, variant));
          // ab === -ba (=== evita che Object.is distingua 0 da -0).
          expect(ab === -ba).toBe(true);
        }
      }
    });

    it(`(${variant}) transitività: a ≥ b e b ≥ c ⇒ a ≥ c (30k terzine)`, () => {
      const random = lcg(4242 + (variant === "hilow" ? 1 : 0));
      const pick = () => HANDS[Math.floor(random() * HANDS.length)].ev;
      for (let t = 0; t < 30000; t += 1) {
        const a = pick();
        const b = pick();
        const c = pick();
        if (
          compareHands(a, b, variant) >= 0 &&
          compareHands(b, c, variant) >= 0
        ) {
          expect(compareHands(a, c, variant)).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it(`(${variant}) riflessività: ogni mano pareggia con sé stessa`, () => {
      for (const { ev } of HANDS) {
        expect(compareHands(ev, ev, variant)).toBe(0);
      }
    });
  }
});

describe("Standard — le parità non guardano il seme", () => {
  // Permutazione ciclica dei semi (biiezione): preserva categoria, ranghi e la
  // relazione "stesso seme", quindi la mano rietichettata è equivalente.
  const SUIT_PERM: Record<Suit, Suit> = { H: "D", D: "C", C: "S", S: "H" };
  const remap = (cards: CardCode[]): CardCode[] =>
    cards.map(
      code => `${code.slice(0, -1)}${SUIT_PERM[code.slice(-1) as Suit]}`
    );

  it("invarianza per permutazione dei semi: in Standard la mano pareggia sempre con la sua rietichettata", () => {
    for (const { cards, ev } of HANDS) {
      const remapped = evaluateHand(remap(cards));
      expect(ev.category).toBe(remapped.category); // struttura identica
      expect(compareHands(ev, remapped, "standard")).toBe(0);
    }
  });

  it("controprova: in Hi/Low la permutazione dei semi può cambiare l'esito", () => {
    // Almeno una mano combinatoria cambia risultato cambiando i semi (il seme
    // conta in Hi/Low): dimostra che la variante non è degenere.
    const changed = HANDS.some(({ cards, ev }) => {
      if (ev.category === CATS.HIGH || ev.category === CATS.QUADS) return false;
      const remapped = evaluateHand(remap(cards));
      return compareHands(ev, remapped, "hilow") !== 0;
    });
    expect(changed).toBe(true);
  });
});

describe("Hi/Low — oracolo indipendente sul seme di spareggio", () => {
  function bestSuitOfValue(
    parsed: ReturnType<typeof cardParts>[],
    value: number
  ): Suit {
    const matching = parsed.filter(card => card.value === value);
    return matching.reduce(
      (best, card) =>
        SUIT_PRIORITY[card.suit] > SUIT_PRIORITY[best] ? card.suit : best,
      matching[0].suit
    );
  }

  function expectedTiebreakSuit(
    ev: HandEvaluation,
    parsed: ReturnType<typeof cardParts>[]
  ): Suit | null {
    switch (ev.category) {
      case CATS.STRAIGHT_FLUSH:
      case CATS.FLUSH:
        return parsed[0].suit; // tutte dello stesso seme
      case CATS.STRAIGHT:
        return bestSuitOfValue(parsed, ev.high!); // carta più alta della scala
      case CATS.FULL_HOUSE:
        return bestSuitOfValue(parsed, ev.tripRank!); // seme del tris
      case CATS.TRIPS:
      case CATS.PAIR:
        return bestSuitOfValue(parsed, ev.rank!); // seme del tris/della coppia
      case CATS.TWO_PAIR:
        return bestSuitOfValue(parsed, ev.hi!); // seme della coppia più alta
      default:
        return null; // poker (rango unico) e carta alta: nessuno spareggio
    }
  }

  it("il seme è quello della carta più alta della combinazione (i kicker non contano)", () => {
    let checkedCombos = 0;
    for (const { cards, ev } of HANDS) {
      const parsed = cards.map(cardParts);
      const expected = expectedTiebreakSuit(ev, parsed);
      if (expected === null) continue;
      checkedCombos += 1;
      expect(ev.suit, `seme errato per ${ev.label} (${cards.join(" ")})`).toBe(
        expected
      );
    }
    expect(checkedCombos).toBeGreaterThan(50); // il campione copre le combinazioni
  });
});

describe("Hi/Low — due combinazioni pareggiano solo con firma identica", () => {
  function signature(ev: HandEvaluation): string {
    return [
      ev.category,
      ev.level ?? "",
      ev.high ?? "",
      ev.rank ?? "",
      ev.tripRank ?? "",
      ev.pairRank ?? "",
      ev.hi ?? "",
      ev.lo ?? "",
      (ev.ranks ?? []).join("."),
      ev.category === CATS.QUADS || ev.category === CATS.HIGH
        ? ""
        : (ev.suit ?? ""),
    ].join("|");
  }

  it("cmp === 0 (fra combinazioni non 'carta alta') implica stessa firma completa", () => {
    for (let i = 0; i < HANDS.length; i += 1) {
      for (let j = i + 1; j < HANDS.length; j += 1) {
        const a = HANDS[i].ev;
        const b = HANDS[j].ev;
        if (a.category === CATS.HIGH || b.category === CATS.HIGH) continue;
        if (compareHands(a, b, "hilow") === 0) {
          expect(signature(a)).toBe(signature(b));
        }
      }
    }
  });
});
