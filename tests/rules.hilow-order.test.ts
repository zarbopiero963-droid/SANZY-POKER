/**
 * Test matematici hard sulla variante Hi/Low.
 *
 * 1) L'ordinamento delle mani è un preordine totale coerente: antisimmetria
 *    (segni opposti) e transitività su un campione ampio di mani casuali.
 * 2) Oracolo indipendente sul seme di spareggio: il seme memorizzato da
 *    `evaluateHand` deve essere esattamente quello della carta più alta della
 *    combinazione (coppia, doppia coppia, tris, full, scala, colore), ricalcolato
 *    qui senza riusare la logica del motore.
 * 3) In Hi/Low due combinazioni valide (non "carta alta") pareggiano SOLO se
 *    hanno la stessa firma completa: categoria, valori chiave e seme.
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
} from "../client/src/game/rules";

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

// Oracolo indipendente: seme migliore fra le carte di un dato valore.
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
      return null; // poker (rango unico) e carta alta: nessuno spareggio di seme
  }
}

// Firma completa di una valutazione: due mani con firma identica devono pareggiare.
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

const HANDS = randomHands(500, 20260718);

describe("Hi/Low — preordine totale coerente", () => {
  it("antisimmetria: cmp(a,b) e cmp(b,a) hanno sempre segno opposto (125k coppie)", () => {
    for (let i = 0; i < HANDS.length; i += 1) {
      for (let j = i + 1; j < HANDS.length; j += 1) {
        const ab = Math.sign(compareHands(HANDS[i].ev, HANDS[j].ev, "hilow"));
        const ba = Math.sign(compareHands(HANDS[j].ev, HANDS[i].ev, "hilow"));
        // ab === -ba (uso === per evitare che Object.is distingua 0 da -0).
        expect(ab === -ba).toBe(true);
      }
    }
  });

  it("transitività: se a ≥ b e b ≥ c allora a ≥ c (30k terzine campionate)", () => {
    const random = lcg(4242);
    const pick = () => HANDS[Math.floor(random() * HANDS.length)].ev;
    for (let t = 0; t < 30000; t += 1) {
      const a = pick();
      const b = pick();
      const c = pick();
      if (
        compareHands(a, b, "hilow") >= 0 &&
        compareHands(b, c, "hilow") >= 0
      ) {
        expect(compareHands(a, c, "hilow")).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("riflessività: ogni mano pareggia con sé stessa", () => {
    for (const { ev } of HANDS) {
      expect(compareHands(ev, ev, "hilow")).toBe(0);
      expect(compareHands(ev, ev, "standard")).toBe(0);
    }
  });
});

describe("Hi/Low — oracolo indipendente sul seme di spareggio", () => {
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
    expect(checkedCombos).toBeGreaterThan(50); // il campione copre davvero le combinazioni
  });
});

describe("Hi/Low — due combinazioni pareggiano solo con firma identica", () => {
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
