/**
 * Regolamento §6 — divisione dei piatti (Piatto1 = 50, Piatto2 = 50, totale 100).
 *  - Vincitore assoluto di entrambi i piatti → 100%.
 *  - Vincitori diversi nei due piatti → 50/50.
 *  - Un piatto in parità e l'altro vinto da un solo giocatore → 75% al vincitore
 *    assoluto, 25% diviso tra i giocatori in parità (il vincitore assoluto
 *    partecipa anche al 25% se è tra i pareggianti, come nell'esempio del
 *    regolamento: piatto 1000 → 750+125 e 125).
 *  - "Nessuna combinazione" in un piatto = parità fra tutti i giocatori vivi.
 * Ogni scenario è costruito con carte reali (mai duplicate) e verificato sia
 * nei pagamenti sia nelle combinazioni attese. La somma dei pagamenti deve
 * essere SEMPRE uguale al piatto, in gettoni interi.
 */
import { describe, expect, it } from "vitest";
import {
  CATS,
  freshDeck,
  settleShowdown,
  shuffle,
  type CardCode,
  type Settlement,
} from "../client/src/game/rules";

type Scenario = {
  players: { id: string; cards: CardCode[] }[];
  board1: CardCode[];
  board2: CardCode[];
};

function assertNoDuplicates(scenario: Scenario) {
  const all = [
    ...scenario.players.flatMap(player => player.cards),
    ...scenario.board1,
    ...scenario.board2,
  ];
  expect(new Set(all).size, "lo scenario non deve riusare carte").toBe(
    all.length
  );
  expect(scenario.board1).toHaveLength(6);
  expect(scenario.board2).toHaveLength(2);
  scenario.players.forEach(player => expect(player.cards).toHaveLength(5));
}

function settle(
  scenario: Scenario,
  pot: number,
  variant: "standard" | "hilow"
): Settlement {
  assertNoDuplicates(scenario);
  const result = settleShowdown(
    scenario.players,
    scenario.board1,
    scenario.board2,
    pot,
    variant
  );
  const paid = Object.values(result.payouts).reduce(
    (sum, value) => sum + value,
    0
  );
  expect(paid, "la somma dei pagamenti deve essere il piatto esatto").toBe(pot);
  Object.values(result.payouts).forEach(value => {
    expect(Number.isInteger(value), "ogni pagamento è in gettoni interi").toBe(
      true
    );
    expect(value).toBeGreaterThanOrEqual(0);
  });
  return result;
}

const pay = (result: Settlement, id: string) => result.payouts[id] ?? 0;

// ---------------------------------------------------------------- 2 giocatori

describe("2 giocatori", () => {
  it("vincitore assoluto in entrambi i piatti → 100% (entrambe le varianti)", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["AS", "AC", "KD", "JH", "10D"] },
        { id: "b", cards: ["8H", "9C", "7S", "7C", "KH"] },
      ],
      board1: ["AH", "AD", "KC", "9S", "8D", "JC"],
      board2: ["QS", "QC"],
    };
    for (const variant of ["standard", "hilow"] as const) {
      const result = settle(scenario, 1000, variant);
      expect(result.splitRule).toBe("solo");
      expect(result.pot1Winners).toEqual(["a"]);
      expect(result.pot2Winners).toEqual(["a"]);
      expect(result.bestPot1.category).toBe(CATS.QUADS); // poker d'assi
      expect(pay(result, "a")).toBe(1000);
      expect(pay(result, "b")).toBe(0);
    }
  });

  it("un piatto a testa → 50/50 (entrambe le varianti)", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["KS", "AH", "JD", "8H", "7S"] }, // full K sul Piatto 1
        { id: "b", cards: ["QC", "JC", "10S", "9H", "AD"] }, // tris di Q sul Piatto 2
      ],
      board1: ["KH", "KD", "9C", "8S", "7D", "10C"],
      board2: ["QS", "QD"],
    };
    for (const variant of ["standard", "hilow"] as const) {
      const result = settle(scenario, 1000, variant);
      expect(result.splitRule).toBe("50/50");
      expect(result.pot1Winners).toEqual(["a"]);
      expect(result.pot2Winners).toEqual(["b"]);
      expect(result.bestPot1.category).toBe(CATS.FULL_HOUSE);
      expect(result.bestPot2.category).toBe(CATS.TRIPS);
      expect(pay(result, "a")).toBe(500);
      expect(pay(result, "b")).toBe(500);
    }
  });

  it("Standard: parità di colore sul Piatto 1 e nessuna combinazione sul Piatto 2 → 50/50", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "QC", "JD"] }, // colore di cuori
        { id: "b", cards: ["9S", "8S", "7S", "QD", "JC"] }, // colore di picche
      ],
      board1: ["AH", "KH", "AS", "KS", "10C", "10D"],
      board2: ["AD", "KD"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("50/50");
    expect(result.pot1Winners).toEqual(["a", "b"]); // i colori dividono
    expect(result.pot2Winners).toEqual(["a", "b"]); // nessuno ha una combinazione
    expect(result.bestPot1.category).toBe(CATS.FLUSH);
    expect(result.bestPot2.category).toBe(CATS.HIGH);
    expect(pay(result, "a")).toBe(500);
    expect(pay(result, "b")).toBe(500);
  });

  it("Hi/Low, stesse carte: il colore di cuori vince da solo il Piatto 1 → 75/25", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "QC", "JD"] },
        { id: "b", cards: ["9S", "8S", "7S", "QD", "JC"] },
      ],
      board1: ["AH", "KH", "AS", "KS", "10C", "10D"],
      board2: ["AD", "KD"],
    };
    const result = settle(scenario, 1000, "hilow");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a"]); // cuori batte picche
    expect(result.pot2Winners).toEqual(["a", "b"]); // carta alta: parità anche in Hi/Low
    expect(pay(result, "a")).toBe(875); // 750 + 125
    expect(pay(result, "b")).toBe(125);
  });

  it("esempio numerico del regolamento: parità sul Piatto 1, B vince il Piatto 2 → 875/125", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["KD", "KC", "QD", "8S", "9H"] }, // scala media K-alta
        { id: "b", cards: ["8H", "AH", "AD", "9S", "10C"] }, // scala media Q-alta + tris d'assi sul P2
      ],
      board1: ["QS", "JD", "10H", "9C", "7D", "7S"],
      board2: ["AS", "7C"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a", "b"]); // scale medie: dividono in Standard
    expect(result.pot2Winners).toEqual(["b"]);
    expect(result.bestPot1.category).toBe(CATS.STRAIGHT);
    // b sul Piatto 2 arriva alla scala minima 10-9-8-7-A (10C 9S 8H + 7C AS).
    expect(result.bestPot2.category).toBe(CATS.STRAIGHT);
    // 75% = 750 al vincitore assoluto; 25% = 250 diviso a metà (125 ciascuno).
    expect(pay(result, "b")).toBe(875);
    expect(pay(result, "a")).toBe(125);
  });

  it("Hi/Low, stesse carte: la scala K-alta vince il Piatto 1 → 50/50", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["KD", "KC", "QD", "8S", "9H"] },
        { id: "b", cards: ["8H", "AH", "AD", "9S", "10C"] },
      ],
      board1: ["QS", "JD", "10H", "9C", "7D", "7S"],
      board2: ["AS", "7C"],
    };
    const result = settle(scenario, 1000, "hilow");
    expect(result.splitRule).toBe("50/50");
    expect(result.pot1Winners).toEqual(["a"]);
    expect(result.pot2Winners).toEqual(["b"]);
    expect(pay(result, "a")).toBe(500);
    expect(pay(result, "b")).toBe(500);
  });
});

// ---------------------------------------------------------------- 3 giocatori

describe("3 giocatori", () => {
  it("vincitore assoluto → 100%", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["10H", "9H", "8D", "QS", "JD"] },
        { id: "b", cards: ["10S", "9D", "8C", "JH", "QH"] },
        { id: "c", cards: ["AS", "AC", "AD", "AH", "QC"] }, // poker in mano + full sul P2
      ],
      board1: ["KH", "QD", "9C", "8S", "7D", "JC"],
      board2: ["KD", "KC"],
    };
    for (const variant of ["standard", "hilow"] as const) {
      const result = settle(scenario, 1000, variant);
      expect(result.splitRule).toBe("solo");
      expect(result.pot1Winners).toEqual(["c"]);
      expect(result.pot2Winners).toEqual(["c"]);
      expect(pay(result, "c")).toBe(1000);
      expect(pay(result, "a")).toBe(0);
      expect(pay(result, "b")).toBe(0);
    }
  });

  it("2 di 3 pareggiano il Piatto 1, il terzo vince il Piatto 2 → 750 / 125 / 125", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "QC", "JD"] }, // colore di cuori
        { id: "b", cards: ["9S", "8S", "7S", "QD", "JC"] }, // colore di picche
        { id: "c", cards: ["AD", "KD", "10S", "9D", "8C"] }, // coppia d'assi sul P2
      ],
      board1: ["AH", "KH", "AS", "KS", "10C", "10D"],
      board2: ["AC", "7C"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a", "b"]);
    expect(result.pot2Winners).toEqual(["c"]);
    expect(pay(result, "c")).toBe(750);
    expect(pay(result, "a")).toBe(125);
    expect(pay(result, "b")).toBe(125);
  });

  it("3 pareggiano il Piatto 1, uno vince il Piatto 2 → 75% + quota del 25% (resti esatti)", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "JC", "10C"] }, // colore di cuori
        { id: "b", cards: ["9S", "8S", "7S", "JD", "10D"] }, // colore di picche
        { id: "c", cards: ["9D", "8D", "7D", "QD", "QH"] }, // colore di quadri + poker di Q sul P2
      ],
      board1: ["AH", "KH", "AS", "KS", "AD", "KD"],
      board2: ["QC", "QS"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a", "b", "c"]); // tre colori: dividono
    expect(result.pot2Winners).toEqual(["c"]);
    expect(result.bestPot2.category).toBe(CATS.QUADS);
    // c: 750 + 250/3 → 833; a e b: 83 e 83; il resto (1 gettone) va per ordine di posto.
    expect(pay(result, "c")).toBe(833);
    expect(pay(result, "a")).toBe(84);
    expect(pay(result, "b")).toBe(83);
  });

  it("stesso scenario con piatto dispari (997): nessun gettone perso", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "JC", "10C"] },
        { id: "b", cards: ["9S", "8S", "7S", "JD", "10D"] },
        { id: "c", cards: ["9D", "8D", "7D", "QD", "QH"] },
      ],
      board1: ["AH", "KH", "AS", "KS", "AD", "KD"],
      board2: ["QC", "QS"],
    };
    const result = settle(scenario, 997, "standard");
    expect(pay(result, "c")).toBe(831); // 830,83… arrotondato con il resto maggiore
    expect(pay(result, "a")).toBe(83);
    expect(pay(result, "b")).toBe(83);
  });

  it("3 pareggiano il Piatto 1 e nessuno ha combinazioni sul Piatto 2 → divisione equa", () => {
    // Nessuna mano personale può contenere 10-9-8-7 (con l'Asso del Piatto 2
    // nascerebbe la scala minima), né J-10-9-8-7 in mano, né coppie personali.
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "QC", "JC"] },
        { id: "b", cards: ["9S", "8S", "7S", "QD", "JD"] },
        { id: "c", cards: ["9D", "8D", "7D", "QH", "JH"] },
      ],
      board1: ["AH", "KH", "AS", "KS", "AD", "KD"],
      board2: ["AC", "KC"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("50/50");
    expect(result.pot1Winners).toEqual(["a", "b", "c"]);
    expect(result.pot2Winners).toEqual(["a", "b", "c"]);
    expect(result.bestPot2.category).toBe(CATS.HIGH);
    expect(pay(result, "a")).toBe(334); // 333,33… con resto al primo posto
    expect(pay(result, "b")).toBe(333);
    expect(pay(result, "c")).toBe(333);
  });

  it("Hi/Low: il colore di cuori vince il P1, carta alta divide il P2 → 75/25 a tre", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "QC", "JC"] },
        { id: "b", cards: ["9S", "8S", "7S", "QD", "JD"] },
        { id: "c", cards: ["9D", "8D", "7D", "QH", "JH"] },
      ],
      board1: ["AH", "KH", "AS", "KS", "AD", "KD"],
      board2: ["AC", "KC"],
    };
    const result = settle(scenario, 1000, "hilow");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a"]);
    expect(result.pot2Winners).toEqual(["a", "b", "c"]);
    expect(pay(result, "a")).toBe(834); // 750 + 83,33… col resto
    expect(pay(result, "b")).toBe(83);
    expect(pay(result, "c")).toBe(83);
  });
});

// ---------------------------------------------------------------- 4 giocatori

describe("4 giocatori", () => {
  it("vincitore assoluto → 100%", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["10H", "9H", "8D", "QS", "JD"] },
        { id: "b", cards: ["10S", "9D", "8C", "JH", "QH"] },
        { id: "c", cards: ["10C", "10D", "7S", "7C", "KS"] },
        { id: "d", cards: ["AS", "AC", "AD", "AH", "QC"] },
      ],
      board1: ["KH", "QD", "9C", "8S", "7D", "JC"],
      board2: ["KD", "KC"],
    };
    for (const variant of ["standard", "hilow"] as const) {
      const result = settle(scenario, 1000, variant);
      expect(result.splitRule).toBe("solo");
      expect(result.pot1Winners).toEqual(["d"]);
      expect(result.pot2Winners).toEqual(["d"]);
      expect(pay(result, "d")).toBe(1000);
    }
  });

  it("3 di 4 pareggiano il Piatto 1 (tre colori), il quarto vince il Piatto 2 → 750 / 84 / 83 / 83", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["9H", "8H", "7H", "JC", "10C"] },
        { id: "b", cards: ["9S", "8S", "7S", "JD", "10D"] },
        { id: "c", cards: ["9D", "8D", "7D", "JH", "10H"] },
        { id: "d", cards: ["QD", "QH", "JS", "10S", "9C"] }, // poker di Q sul P2
      ],
      board1: ["AH", "KH", "AS", "KS", "AD", "KD"],
      board2: ["QC", "QS"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a", "b", "c"]);
    expect(result.pot2Winners).toEqual(["d"]);
    expect(pay(result, "d")).toBe(750);
    expect(pay(result, "a")).toBe(84);
    expect(pay(result, "b")).toBe(83);
    expect(pay(result, "c")).toBe(83);
  });

  it("4 di 4 pareggiano il Piatto 1 (quattro scale colore!), uno vince il Piatto 2 → 75% + quota", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["QH", "JH", "QD", "JC", "7D"] }, // scala colore media di cuori
        { id: "b", cards: ["QS", "JS", "QC", "JD", "7C"] }, // scala colore media di picche
        { id: "c", cards: ["7H", "AH", "AD", "10D", "10C"] }, // scala colore minima di cuori
        { id: "d", cards: ["7S", "AS", "KH", "8D", "8C"] }, // scala colore minima di picche + full di K sul P2
      ],
      board1: ["10H", "9H", "8H", "10S", "9S", "8S"],
      board2: ["KD", "KC"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("75/25");
    // In Standard tutte le scale colore (minima, media, massima) hanno lo stesso valore.
    expect(result.pot1Winners).toEqual(["a", "b", "c", "d"]);
    expect(result.bestPot1.category).toBe(CATS.STRAIGHT_FLUSH);
    expect(result.pot2Winners).toEqual(["d"]);
    expect(result.bestPot2.category).toBe(CATS.FULL_HOUSE);
    // d: 750 + 62,5 → 812; a,b: 63; c: 62 (resti in ordine di posto). Somma = 1000.
    expect(pay(result, "d")).toBe(812);
    expect(pay(result, "a")).toBe(63);
    expect(pay(result, "b")).toBe(63);
    expect(pay(result, "c")).toBe(62);
  });

  it("Hi/Low, stesse carte: la scala colore media di cuori vince da sola il P1 → 50/50", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["QH", "JH", "QD", "JC", "7D"] },
        { id: "b", cards: ["QS", "JS", "QC", "JD", "7C"] },
        { id: "c", cards: ["7H", "AH", "AD", "10D", "10C"] },
        { id: "d", cards: ["7S", "AS", "KH", "8D", "8C"] },
      ],
      board1: ["10H", "9H", "8H", "10S", "9S", "8S"],
      board2: ["KD", "KC"],
    };
    const result = settle(scenario, 1000, "hilow");
    expect(result.splitRule).toBe("50/50");
    expect(result.pot1Winners).toEqual(["a"]); // media > minima; a parità di valore, cuori > picche
    expect(result.pot2Winners).toEqual(["d"]);
    expect(pay(result, "a")).toBe(500);
    expect(pay(result, "d")).toBe(500);
  });

  it("4 pareggiano ENTRAMBI i piatti → 25% ciascuno (caso esplicito del regolamento)", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["QH", "JH", "7D", "9D", "AC"] }, // scala colore media di cuori
        { id: "b", cards: ["QS", "JS", "7C", "9C", "AD"] }, // scala colore media di picche
        { id: "c", cards: ["7H", "AH", "10D", "JD", "8D"] }, // scala colore minima di cuori
        { id: "d", cards: ["7S", "AS", "JC", "10C", "8C"] }, // scala colore minima di picche
      ],
      board1: ["10H", "9H", "8H", "10S", "9S", "8S"],
      board2: ["KD", "KC"],
    };
    const result = settle(scenario, 1000, "standard");
    expect(result.splitRule).toBe("50/50");
    expect(result.pot1Winners).toEqual(["a", "b", "c", "d"]);
    expect(result.pot2Winners).toEqual(["a", "b", "c", "d"]); // tutti coppia di K, senza kicker
    expect(result.bestPot2.category).toBe(CATS.PAIR);
    expect(pay(result, "a")).toBe(250);
    expect(pay(result, "b")).toBe(250);
    expect(pay(result, "c")).toBe(250);
    expect(pay(result, "d")).toBe(250);
  });

  it("Hi/Low, stesse carte: cuori decide il P1; sul P2 restano in parità i due con cuori → 75/25", () => {
    const scenario: Scenario = {
      players: [
        { id: "a", cards: ["QH", "JH", "7D", "9D", "AC"] },
        { id: "b", cards: ["QS", "JS", "7C", "9C", "AD"] },
        { id: "c", cards: ["7H", "AH", "10D", "JD", "8D"] },
        { id: "d", cards: ["7S", "AS", "JC", "10C", "8C"] },
      ],
      board1: ["10H", "9H", "8H", "10S", "9S", "8S"],
      board2: ["KD", "KC"],
    };
    const result = settle(scenario, 1000, "hilow");
    expect(result.splitRule).toBe("75/25");
    expect(result.pot1Winners).toEqual(["a"]); // scala colore media di cuori
    // Coppia di K per tutti: lo spareggio Hi/Low sul seme lascia in parità
    // le due mani che contengono cuori (a e c).
    expect(result.pot2Winners).toEqual(["a", "c"]);
    expect(pay(result, "a")).toBe(875); // 750 + 125
    expect(pay(result, "c")).toBe(125);
    expect(pay(result, "b")).toBe(0);
    expect(pay(result, "d")).toBe(0);
  });
});

// ------------------------------------------------- proprietà su mani casuali

describe("proprietà matematiche su mani casuali (fuzzing deterministico)", () => {
  function lcg(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 2 ** 32;
    };
  }

  for (const variant of ["standard", "hilow"] as const) {
    for (const playerCount of [2, 3, 4]) {
      it(`(${variant}, ${playerCount} giocatori) 250 mani casuali: conservazione e coerenza`, () => {
        const random = lcg(
          playerCount * 1000 + (variant === "hilow" ? 1 : 0) + 7
        );
        for (let round = 0; round < 250; round += 1) {
          const deck = shuffle(freshDeck(), random);
          const players = Array.from({ length: playerCount }, (_, index) => ({
            id: `p${index}`,
            cards: deck.splice(0, 5),
          }));
          const board1 = deck.splice(0, 6);
          const board2 = deck.splice(0, 2);
          const pot = 25 * playerCount + Math.floor(random() * 400) * 25;
          const result = settleShowdown(players, board1, board2, pot, variant);

          const paid = Object.values(result.payouts).reduce(
            (sum, value) => sum + value,
            0
          );
          expect(paid).toBe(pot); // nessun gettone creato o distrutto
          Object.values(result.payouts).forEach(value => {
            expect(Number.isInteger(value)).toBe(true);
            expect(value).toBeGreaterThanOrEqual(0);
          });

          // I vincitori sono sempre giocatori reali e non vuoti.
          expect(result.pot1Winners.length).toBeGreaterThan(0);
          expect(result.pot2Winners.length).toBeGreaterThan(0);
          const ids = new Set(players.map(player => player.id));
          [...result.pot1Winners, ...result.pot2Winners].forEach(id =>
            expect(ids.has(id)).toBe(true)
          );

          // Chi non vince alcun piatto non riceve nulla.
          for (const player of players) {
            const isWinner =
              result.pot1Winners.includes(player.id) ||
              result.pot2Winners.includes(player.id);
            if (!isWinner) expect(result.payouts[player.id] ?? 0).toBe(0);
          }

          // La regola dichiarata corrisponde alla struttura dei vincitori.
          const n1 = result.pot1Winners.length;
          const n2 = result.pot2Winners.length;
          if (result.splitRule === "solo") {
            expect(n1).toBe(1);
            expect(n2).toBe(1);
            expect(result.pot1Winners[0]).toBe(result.pot2Winners[0]);
            expect(result.payouts[result.pot1Winners[0]]).toBe(pot);
          } else if (result.splitRule === "75/25") {
            expect((n1 === 1 && n2 > 1) || (n2 === 1 && n1 > 1)).toBe(true);
            const soloId =
              n1 === 1 ? result.pot1Winners[0] : result.pot2Winners[0];
            // Il vincitore assoluto prende almeno il 75% (a meno di resti interi).
            expect(result.payouts[soloId]).toBeGreaterThanOrEqual(
              Math.floor(pot * 0.75)
            );
          } else {
            expect(
              n1 === 1 &&
                n2 === 1 &&
                result.pot1Winners[0] === result.pot2Winners[0]
            ).toBe(false);
          }

          // Fatto matematico Sanzy: sul Piatto 1 esiste sempre almeno una coppia.
          expect(result.bestPot1.category).toBeGreaterThanOrEqual(CATS.PAIR);
        }
      });
    }
  }
});
