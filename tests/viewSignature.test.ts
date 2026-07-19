/**
 * Render-gate dell'HUD (client/src/game/viewSignature.ts).
 *
 * La firma decide se ricostruire l'HUD 2D Babylon:
 * - se un campo VISIBILE dello stato cambia, la firma DEVE cambiare (altrimenti
 *   l'HUD resta "stantio" e mostra valori vecchi — es. gettoni/piatto sbagliati);
 * - se cambia SOLO un campo audio (`eventSerial`/`lastEvent`), la firma NON deve
 *   cambiare (altrimenti l'HUD si ricostruisce a ogni evento e lo slider di
 *   rilancio si azzera durante il turno del giocatore — il bug che la PR risolve).
 *
 * Questi test sono la guardia anti-drift: se un domani qualcuno aggiunge un campo
 * di stato visibile e la firma smette di coprirlo, il test rosso lo intercetta.
 */
import { afterEach, describe, expect, it } from "vitest";
import { GameController, type TableState } from "../client/src/game/state";
import { setLocale } from "../client/src/game/i18n";
import {
  VISIBLE_LOG_LINES,
  computeViewSignature,
} from "../client/src/game/viewSignature";

const UI = { screen: "table" as const, mobile: false, mobileHeight: 720 };

/** Tavolo 3 giocatori pronto (freshTable), stato deterministico e isolato. */
function baseTable(): TableState {
  return new GameController(true).table;
}
const clone = (t: TableState): TableState => structuredClone(t);

afterEach(() => setLocale("it"));

describe("viewSignature — render-gate HUD", () => {
  it("è deterministica e stabile: stesso stato → stessa firma", () => {
    const t = baseTable();
    expect(computeViewSignature(t, UI)).toBe(
      computeViewSignature(clone(t), UI)
    );
  });

  it("eventSerial e lastEvent NON cambiano la firma (solo cue audio)", () => {
    const t = baseTable();
    const sig = computeViewSignature(t, UI);
    const t2 = clone(t);
    t2.eventSerial += 7;
    t2.lastEvent = "winner";
    expect(computeViewSignature(t2, UI)).toBe(sig);
  });

  it("log: fuori dalla finestra visibile non conta, in testa e in lunghezza sì", () => {
    const t = baseTable();
    t.log = Array.from(
      { length: VISIBLE_LOG_LINES + 5 },
      (_, i) => `riga ${i}`
    );
    const sig = computeViewSignature(t, UI);

    // Riga oltre VISIBLE_LOG_LINES cambiata → NON visibile → stessa firma.
    const beyond = clone(t);
    beyond.log[VISIBLE_LOG_LINES + 2] = "fuori vista";
    expect(computeViewSignature(beyond, UI)).toBe(sig);

    // Append in coda: cambia la lunghezza totale → firma diversa.
    const appended = clone(t);
    appended.log.push("coda");
    expect(computeViewSignature(appended, UI)).not.toBe(sig);

    // Cambio di una riga VISIBILE (in testa) → firma diversa.
    const head = clone(t);
    head.log[0] = "nuova testa";
    expect(computeViewSignature(head, UI)).not.toBe(sig);
  });

  it("locale, mobile e altezza mobile cambiano la firma", () => {
    const t = baseTable();
    const sig = computeViewSignature(t, UI);

    setLocale("en");
    expect(computeViewSignature(t, UI)).not.toBe(sig);
    setLocale("it");

    expect(computeViewSignature(t, { ...UI, mobile: true })).not.toBe(sig);
    expect(computeViewSignature(t, { ...UI, mobileHeight: 500 })).not.toBe(sig);
  });

  it("lobby: dipende solo da schermo/lingua/layout, non dallo stato del tavolo", () => {
    const t = baseTable();
    const lobby = {
      screen: "lobby" as const,
      mobile: false,
      mobileHeight: 720,
    };
    const sig = computeViewSignature(t, lobby);

    // Mutare lo stato del tavolo NON ridisegna la lobby.
    const t2 = clone(t);
    t2.pot += 999;
    t2.players[0].chips += 500;
    expect(computeViewSignature(t2, lobby)).toBe(sig);

    // Ma un cambio lingua sì (i testi t() della lobby vanno ridisegnati).
    setLocale("fr");
    expect(computeViewSignature(t, lobby)).not.toBe(sig);
  });

  it("guardia anti-drift: ogni campo VISIBILE mutato cambia la firma", () => {
    const t = baseTable();
    // Popola un risultato di showdown per coprire anche quei campi.
    t.lastResult = {
      potTotal: 100,
      pot1Winners: ["human"],
      pot2Winners: ["bot-1"],
      bestPot1: "Colore",
      bestPot2: "Coppia",
      payouts: { human: 50, "bot-1": 50 },
      splitRule: "50/50",
    };
    const sig = computeViewSignature(t, UI);

    const mutations: Array<[string, (x: TableState) => void]> = [
      ["pot", x => (x.pot += 1)],
      [
        "status",
        x => (x.status = x.status === "playing" ? "waiting" : "playing"),
      ],
      ["phase", x => (x.phase = x.phase === "flop" ? "turn" : "flop")],
      ["handNumber", x => (x.handNumber += 1)],
      ["turnIndex", x => (x.turnIndex += 1)],
      ["roundMaxBet", x => (x.roundMaxBet += 1)],
      ["roundRaises", x => (x.roundRaises += 1)],
      ["board1Revealed", x => (x.board1Revealed += 3)],
      ["board2Revealed", x => (x.board2Revealed = !x.board2Revealed)],
      ["revealAll", x => (x.revealAll = !x.revealAll)],
      [
        "dealerIndex",
        x => (x.dealerIndex = (x.dealerIndex + 1) % x.players.length),
      ],
      [
        "variant",
        x => (x.variant = x.variant === "standard" ? "hilow" : "standard"),
      ],
      ["smallBlind", x => (x.smallBlind += 1)],
      ["bigBlind", x => (x.bigBlind += 1)],
      ["name", x => (x.name = `${x.name}!`)],
      ["board1", x => (x.board1 = [...x.board1, "AH"])],
      ["board2", x => (x.board2 = [...x.board2, "KD"])],
      ["player.chips", x => (x.players[0].chips += 1)],
      ["player.roundBet", x => (x.players[0].roundBet += 1)],
      ["player.folded", x => (x.players[0].folded = !x.players[0].folded)],
      ["player.allIn", x => (x.players[0].allIn = !x.players[0].allIn)],
      [
        "player.lastAction",
        x => (x.players[0].lastAction = `${x.players[0].lastAction}?`),
      ],
      [
        "player.cards",
        x => (x.players[0].cards = [...x.players[0].cards, "7S"]),
      ],
      ["player.name", x => (x.players[0].name = "Z")],
      ["lastResult.splitRule", x => (x.lastResult!.splitRule = "solo")],
      ["lastResult.pot1Winners", x => (x.lastResult!.pot1Winners = ["bot-2"])],
      ["lastResult.bestPot1", x => (x.lastResult!.bestPot1 = "Poker")],
      ["lastResult=null", x => (x.lastResult = null)],
      ["log.head", x => (x.log = ["evento nuovo", ...x.log])],
    ];

    for (const [label, mutate] of mutations) {
      const t2 = clone(t);
      mutate(t2);
      expect(computeViewSignature(t2, UI), `campo ${label}`).not.toBe(sig);
    }
  });
});
