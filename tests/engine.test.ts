/**
 * Motore di gioco — regolamento §2 (2-4 giocatori), §3 (ante/bui, cinque giri di
 * puntata, sequenza flop→turn→river→piatto2), scarto (variante della casa) e
 * showdown §4-§6. I timer sono finti e il caso è deterministico (seed fisso).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GameController, type TableState } from "../client/src/game/state";
import type { Variant } from "../client/src/game/rules";

function lcg(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function totalChips(table: TableState) {
  return table.players.reduce((sum, player) => sum + player.chips, 0) + table.pot;
}

function allCards(table: TableState) {
  return [...table.players.flatMap((player) => player.cards), ...table.board1, ...table.board2];
}

/** Avanza i timer finché la mano corrente non è conclusa (status "waiting"). */
function runHandToEnd(controller: GameController, maxSteps = 5000) {
  for (let step = 0; step < maxSteps; step += 1) {
    if (controller.table.status === "waiting" && controller.table.handNumber > 0) return;
    vi.advanceTimersByTime(250);
  }
  throw new Error(`La mano non si è conclusa: fase ${controller.table.phase}`);
}

/** Avanza i timer finché la condizione non è vera. */
function advanceUntil(controller: GameController, predicate: (table: TableState) => boolean, maxSteps = 2000) {
  for (let step = 0; step < maxSteps; step += 1) {
    if (predicate(controller.table)) return;
    vi.advanceTimersByTime(150);
  }
  throw new Error(`Condizione mai raggiunta: fase ${controller.table.phase}, turno ${controller.table.turnIndex}`);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("distribuzione e struttura della mano", () => {
  for (const botCount of [1, 2, 3]) {
    it(`${botCount + 1} giocatori: 6 carte a testa, poi scarto a 5; board 6+2; nessuna carta duplicata`, () => {
      vi.spyOn(Math, "random").mockImplementation(lcg(11 + botCount));
      const controller = new GameController(true);
      controller.openTable(botCount, "standard");
      advanceUntil(controller, (table) => table.phase === "discard");

      expect(controller.table.players).toHaveLength(botCount + 1);
      controller.table.players.forEach((player) => expect(player.cards).toHaveLength(6));
      expect(controller.table.board1).toHaveLength(6);
      expect(controller.table.board2).toHaveLength(2);
      const dealt = allCards(controller.table);
      expect(new Set(dealt).size).toBe(dealt.length);
      expect(dealt.length).toBe((botCount + 1) * 6 + 8);

      advanceUntil(controller, (table) => table.players.every((player) => player.cards.length === 5));
      const afterDiscard = allCards(controller.table);
      expect(new Set(afterDiscard).size).toBe(afterDiscard.length);
      controller.dispose();
    });
  }

  for (const botCount of [1, 2, 3]) {
    it(`${botCount + 1} giocatori: l'ante vale un piccolo buio a testa (§3)`, () => {
      vi.spyOn(Math, "random").mockImplementation(lcg(23 + botCount));
      const controller = new GameController(true);
      controller.openTable(botCount, "standard");
      advanceUntil(controller, (table) => table.phase === "discard");
      const players = botCount + 1;
      expect(controller.table.pot).toBe(players * controller.table.smallBlind);
      controller.table.players.forEach((player) => expect(player.chips).toBe(5000 - controller.table.smallBlind));
      controller.dispose();
    });
  }
});

describe("sequenza delle fasi (§3: cinque giri di puntata)", () => {
  const EXPECTED_ORDER = ["blinds", "discard", "preflop", "flop", "turn", "river", "pot2"];

  for (const variant of ["standard", "hilow"] as Variant[]) {
    it(`(${variant}) le fasi seguono l'ordine bui → scarto → pre-board → flop → turn → river → piatto2`, () => {
      vi.spyOn(Math, "random").mockImplementation(lcg(variant === "hilow" ? 101 : 100));
      const controller = new GameController(true);
      const phasesSeen: string[] = [];
      controller.subscribe((table) => {
        if (phasesSeen[phasesSeen.length - 1] !== table.phase) phasesSeen.push(table.phase);
      });
      controller.openTable(3, variant);
      runHandToEnd(controller);

      const relevant = phasesSeen.filter((phase) => EXPECTED_ORDER.includes(phase));
      const indexes = relevant.map((phase) => EXPECTED_ORDER.indexOf(phase));
      for (let index = 1; index < indexes.length; index += 1) {
        expect(indexes[index], `ordine fasi violato: ${relevant.join(" → ")}`).toBeGreaterThanOrEqual(indexes[index - 1]);
      }
      // Il primo giro di puntata avviene PRIMA del flop (pre-board).
      expect(relevant).toContain("preflop");
      controller.dispose();
    });
  }

  it("durante il pre-board il flop resta coperto; le carte si scoprono 3, poi 5, poi 6, poi il Piatto 2", () => {
    vi.spyOn(Math, "random").mockImplementation(lcg(77));
    const controller = new GameController(true);
    const reveals: { phase: string; board1: number; board2: boolean }[] = [];
    controller.subscribe((table) => {
      const last = reveals[reveals.length - 1];
      if (!last || last.phase !== table.phase || last.board1 !== table.board1Revealed || last.board2 !== table.board2Revealed) {
        reveals.push({ phase: table.phase, board1: table.board1Revealed, board2: table.board2Revealed });
      }
    });
    controller.openTable(2, "standard");
    runHandToEnd(controller);

    for (const snapshot of reveals) {
      if (snapshot.phase === "preflop") {
        expect(snapshot.board1).toBe(0);
        expect(snapshot.board2).toBe(false);
      }
      if (snapshot.phase === "flop") expect(snapshot.board1).toBe(3);
      if (snapshot.phase === "turn") expect(snapshot.board1).toBe(5);
      if (snapshot.phase === "river") expect(snapshot.board1).toBe(6);
      if (snapshot.phase === "pot2") {
        expect(snapshot.board1).toBe(6);
        expect(snapshot.board2).toBe(true);
      }
    }
    controller.dispose();
  });
});

describe("integrità delle puntate e dei gettoni", () => {
  for (const variant of ["standard", "hilow"] as Variant[]) {
    for (const botCount of [1, 2, 3]) {
      it(`(${variant}, ${botCount + 1} giocatori) 8 mani complete: gettoni conservati e pagamenti esatti`, () => {
        vi.spyOn(Math, "random").mockImplementation(lcg(botCount * 31 + (variant === "hilow" ? 500 : 0) + 3));
        const controller = new GameController(true);

        let baseline = -1;
        controller.subscribe((table) => {
          if (table.status !== "playing") return;
          if (baseline === -1) baseline = totalChips(table);
          // Invariante: durante la mano nessun gettone appare o sparisce.
          expect(totalChips(table)).toBe(baseline);
          table.players.forEach((player) => {
            expect(player.chips).toBeGreaterThanOrEqual(0);
            expect(player.roundBet).toBeGreaterThanOrEqual(0);
          });
          expect(table.pot).toBeGreaterThanOrEqual(0);
          if (table.turnIndex >= 0) {
            const maxBet = Math.max(...table.players.map((player) => player.roundBet));
            expect(table.roundMaxBet).toBe(maxBet);
          }
        });

        controller.openTable(botCount, variant);
        for (let hand = 0; hand < 8; hand += 1) {
          baseline = -1;
          if (hand > 0) controller.startHand();
          runHandToEnd(controller);
          const result = controller.table.lastResult;
          expect(result).not.toBeNull();
          const paid = Object.values(result!.payouts).reduce((sum, value) => sum + value, 0);
          expect(paid).toBe(result!.potTotal);
          expect(controller.table.pot).toBe(0);
          expect(totalChips(controller.table)).toBe(baseline);
          if (result!.splitRule !== "solo" || result!.bestPot1 !== "Vittoria per fold") {
            expect(result!.pot1Winners.length).toBeGreaterThan(0);
            expect(result!.pot2Winners.length).toBeGreaterThan(0);
          }
        }
        controller.dispose();
      });
    }
  }

  it("chi resta solo dopo i fold prende tutto senza mostrare le carte (§4)", () => {
    vi.spyOn(Math, "random").mockImplementation(lcg(999));
    const controller = new GameController(false); // umano manuale
    controller.openTable(1, "standard"); // testa a testa
    advanceUntil(controller, (table) => table.phase === "discard");
    controller.humanDiscard(controller.table.players[0].cards[0]);
    advanceUntil(controller, (table) => table.phase === "preflop" && table.turnIndex === 0);

    const potBefore = controller.table.pot;
    const botChipsBefore = controller.table.players[1].chips;
    controller.humanAction("fold");
    expect(controller.table.status).toBe("waiting");
    expect(controller.table.lastResult?.splitRule).toBe("solo");
    expect(controller.table.lastResult?.bestPot1).toBe("Vittoria per fold");
    expect(controller.table.revealAll).toBe(false); // non è obbligato a mostrare le carte
    expect(controller.table.players[1].chips).toBe(botChipsBefore + potBefore);
    expect(controller.table.pot).toBe(0);
    controller.dispose();
  });

  it("il rilancio minimo è un grande buio sopra la puntata corrente (§3)", () => {
    vi.spyOn(Math, "random").mockImplementation(lcg(424242));
    const controller = new GameController(false);
    controller.openTable(1, "standard");
    advanceUntil(controller, (table) => table.phase === "discard");
    controller.humanDiscard(controller.table.players[0].cards[0]);
    advanceUntil(controller, (table) => table.phase === "preflop" && table.turnIndex === 0);

    const human = controller.table.players[0];
    const before = human.chips;
    const previousMax = controller.table.roundMaxBet;
    controller.humanAction("raise", 1); // richiesta sotto il minimo: viene alzata al minimo legale
    expect(human.roundBet).toBe(previousMax + controller.table.bigBlind);
    expect(controller.table.roundMaxBet).toBe(previousMax + controller.table.bigBlind);
    expect(human.chips).toBe(before - human.roundBet);
    controller.dispose();
  });

  it("dopo un rilancio gli avversari devono agire di nuovo; il giro si chiude a puntate pari", () => {
    vi.spyOn(Math, "random").mockImplementation(lcg(1717));
    const controller = new GameController(false);
    controller.openTable(1, "standard");
    advanceUntil(controller, (table) => table.phase === "discard");
    controller.humanDiscard(controller.table.players[0].cards[0]);
    advanceUntil(controller, (table) => table.phase === "preflop" && table.turnIndex === 0);

    controller.humanAction("raise", 200);
    const bot = controller.table.players[1];
    expect(controller.table.phase).toBe("preflop"); // il giro non può chiudersi: il bot deve rispondere
    expect(bot.acted).toBe(false);
    advanceUntil(controller, (table) => table.phase !== "preflop" || table.turnIndex === 0);
    if (controller.table.phase !== "preflop") {
      // Il bot ha chiamato (fase avanzata) oppure ha foldato (mano chiusa).
      if (controller.table.status === "playing") {
        expect(controller.table.players.filter((p) => !p.folded).every((p) => p.roundBet === 0)).toBe(true);
      }
    }
    controller.dispose();
  });

  it("all-in: le fiches non diventano mai negative e il piatto raccoglie tutto", () => {
    vi.spyOn(Math, "random").mockImplementation(lcg(31337));
    const controller = new GameController(false);
    controller.openTable(1, "standard");
    advanceUntil(controller, (table) => table.phase === "discard");
    controller.humanDiscard(controller.table.players[0].cards[0]);
    advanceUntil(controller, (table) => table.phase === "preflop" && table.turnIndex === 0);

    const potBefore = controller.table.pot;
    const chipsBefore = controller.table.players[0].chips;
    controller.humanAction("allin");
    const human = controller.table.players[0];
    expect(human.chips).toBe(0);
    expect(human.allIn).toBe(true);
    expect(controller.table.pot).toBe(potBefore + chipsBefore);
    controller.dispose();
  });
});

describe("dealer e ordine di parola (§2-§3)", () => {
  it("il bottone avanza di un posto a ogni mano e parla per primo chi è alla sua sinistra", () => {
    vi.spyOn(Math, "random").mockImplementation(lcg(2024));
    const controller = new GameController(true);
    const firstActors: { dealer: number; actor: number }[] = [];
    let captured = false;
    controller.subscribe((table) => {
      if (table.phase === "preflop" && table.turnIndex >= 0 && !captured) {
        firstActors.push({ dealer: table.dealerIndex, actor: table.turnIndex });
        captured = true;
      }
    });
    controller.openTable(3, "standard");
    const dealers: number[] = [];
    for (let hand = 0; hand < 4; hand += 1) {
      captured = false;
      if (hand > 0) controller.startHand();
      runHandToEnd(controller);
      dealers.push(controller.table.dealerIndex);
    }
    // Bottone: 0,1,2,3 in sequenza su 4 giocatori.
    expect(dealers).toEqual([0, 1, 2, 3]);
    // Nel pre-board nessuno può essere già fold/all-in (il buio non supera mai lo
    // stack grazie alla ricarica minima), quindi parla sempre il posto dopo il bottone.
    expect(firstActors.length).toBeGreaterThan(0);
    for (const entry of firstActors) {
      expect(entry.actor).toBe((entry.dealer + 1) % 4);
    }
    controller.dispose();
  });
});
