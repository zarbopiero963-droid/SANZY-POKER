/**
 * Noir Emerald Arena — macchina a stati della partita.
 * Ogni mutazione emette uno snapshot alla scena; i timeout dei bot sono posseduti
 * dal controller e vengono sempre rimossi in dispose per evitare turni fantasma.
 */

import { createBot, botChooseDiscard, botDecision } from "./bots";
import {
  freshDeck,
  settleShowdown,
  shuffle,
  type CardCode,
  type HandEvaluation,
  type Variant,
} from "./rules";

export type Phase =
  | "waiting"
  | "blinds"
  | "discard"
  | "preflop"
  | "flop"
  | "turn"
  | "river"
  | "pot2"
  | "showdown";
export type PokerAction = "fold" | "check" | "call" | "raise" | "allin";

export type PlayerState = {
  id: string;
  name: string;
  title: string;
  isBot: boolean;
  aggression: number;
  accent: string;
  chips: number;
  cards: CardCode[];
  folded: boolean;
  allIn: boolean;
  roundBet: number;
  acted: boolean;
  paidBlind: boolean;
  lastAction: string;
};

export type ShowdownEntry = {
  id: string;
  name: string;
  pot1: HandEvaluation;
  pot2: HandEvaluation;
};

export type LastResult = {
  potTotal: number;
  pot1Winners: string[];
  pot2Winners: string[];
  bestPot1: string;
  bestPot2: string;
  payouts: Record<string, number>;
  splitRule: "50/50" | "75/25" | "solo";
};

export type TableState = {
  name: string;
  variant: Variant;
  status: "waiting" | "playing";
  players: PlayerState[];
  dealerIndex: number;
  phase: Phase;
  board1: CardCode[];
  board1Revealed: number;
  board2: CardCode[];
  board2Revealed: boolean;
  pot: number;
  roundMaxBet: number;
  roundRaises: number;
  turnIndex: number;
  smallBlind: number;
  bigBlind: number;
  handNumber: number;
  log: string[];
  lastResult: LastResult | null;
  revealAll: boolean;
  eventSerial: number;
  lastEvent: string;
};

type Listener = (table: TableState, screen: "lobby" | "table") => void;

function humanPlayer(chips: number): PlayerState {
  return {
    id: "human",
    name: "Tu",
    title: "Challenger",
    isBot: false,
    aggression: 1,
    accent: "#D9B45B",
    chips,
    cards: [],
    folded: false,
    allIn: false,
    roundBet: 0,
    acted: false,
    paidBlind: false,
    lastAction: "Pronto",
  };
}

function freshTable(botCount: number, variant: Variant): TableState {
  const startChips = 5000;
  return {
    name:
      variant === "hilow" ? "Sala Aurora · Hi/Low" : "Sala Smeraldo · Standard",
    variant,
    status: "waiting",
    players: [
      humanPlayer(startChips),
      ...Array.from({ length: botCount }, (_, index) =>
        createBot(index, startChips)
      ),
    ],
    dealerIndex: -1,
    phase: "waiting",
    board1: [],
    board1Revealed: 0,
    board2: [],
    board2Revealed: false,
    pot: 0,
    roundMaxBet: 0,
    roundRaises: 0,
    turnIndex: -1,
    smallBlind: 25,
    bigBlind: 50,
    handNumber: 0,
    log: ["Tavolo pronto. I bot stanno prendendo posto."],
    lastResult: null,
    revealAll: false,
    eventSerial: 0,
    lastEvent: "table-ready",
  };
}

export class GameController {
  table: TableState = freshTable(3, "standard");
  screen: "lobby" | "table" = "table";
  readonly demo: boolean;
  private listeners = new Set<Listener>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;

  constructor(demo = false) {
    this.demo = demo;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.table, this.screen);
    return () => this.listeners.delete(listener);
  }

  private emit(event?: string) {
    if (event) {
      this.table.lastEvent = event;
      this.table.eventSerial += 1;
    }
    this.listeners.forEach(listener => listener(this.table, this.screen));
  }

  private later(callback: () => void, milliseconds: number) {
    if (this.disposed || this.timer !== null) return;
    this.timer = setTimeout(() => {
      this.timer = null;
      if (!this.disposed) callback();
    }, milliseconds);
  }

  private log(message: string) {
    this.table.log.unshift(message);
    this.table.log = this.table.log.slice(0, 18);
  }

  openTable(botCount = 3, variant: Variant = "standard") {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.table = freshTable(Math.max(1, Math.min(3, botCount)), variant);
    this.screen = "table";
    this.emit("enter-table");
    this.later(() => this.startHand(), 650);
  }

  goToLobby() {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.screen = "lobby";
    this.emit("enter-lobby");
  }

  startHand() {
    if (this.table.players.length < 2) return;
    const deck = shuffle(freshDeck());
    this.table.dealerIndex =
      (this.table.dealerIndex + 1) % this.table.players.length;
    this.table.players.forEach(player => {
      if (player.chips < this.table.bigBlind) player.chips = 5000;
      player.folded = false;
      player.allIn = false;
      player.roundBet = 0;
      player.acted = false;
      player.paidBlind = false;
      player.cards = deck.splice(0, 6);
      player.lastAction = "Carte ricevute";
    });
    this.table.board1 = deck.splice(0, 6);
    this.table.board2 = deck.splice(0, 2);
    this.table.board1Revealed = 0;
    this.table.board2Revealed = false;
    this.table.pot = 0;
    this.table.roundMaxBet = 0;
    this.table.roundRaises = 0;
    this.table.phase = "blinds";
    this.table.status = "playing";
    this.table.handNumber += 1;
    this.table.lastResult = null;
    this.table.revealAll = false;
    this.table.turnIndex = -1;
    this.table.log = [
      `Mano ${this.table.handNumber}. Bottone a ${this.table.players[this.table.dealerIndex].name}.`,
    ];
    this.emit("deal");
    this.continueAutomation();
  }

  private nextActiveIndex(fromIndex: number) {
    for (let offset = 1; offset <= this.table.players.length; offset += 1) {
      const index = (fromIndex + offset) % this.table.players.length;
      const player = this.table.players[index];
      if (!player.folded && !player.allIn) return index;
    }
    return -1;
  }

  private roundComplete() {
    return this.table.players
      .filter(player => !player.folded)
      .every(
        player =>
          player.allIn ||
          (player.acted && player.roundBet === this.table.roundMaxBet)
      );
  }

  private openBettingAfterReveal(delay: number) {
    this.table.turnIndex = -1;
    this.later(() => {
      this.table.turnIndex = this.nextActiveIndex(this.table.dealerIndex);
      if (this.table.turnIndex === -1) {
        this.emit("reveal-complete");
        this.later(() => this.advancePhase(), 800);
        return;
      }
      this.emit("betting-open");
      this.continueAutomation();
    }, delay);
  }

  private stepBlind() {
    const player = this.table.players.find(entry => !entry.paidBlind);
    if (!player) {
      this.table.phase = "discard";
      this.log("Buio completato. Ogni giocatore scarta una carta.");
      this.emit("discard-phase");
      this.continueAutomation();
      return;
    }
    const amount = Math.min(this.table.smallBlind, player.chips);
    player.chips -= amount;
    this.table.pot += amount;
    player.paidBlind = true;
    player.allIn = player.chips === 0;
    player.lastAction = `Buio ${amount}`;
    this.log(`${player.name} versa ${amount} nel piatto.`);
    this.emit("chips-to-pot");
    this.continueAutomation();
  }

  private discard(playerIndex: number, card: CardCode) {
    const player = this.table.players[playerIndex];
    if (!player || player.cards.length !== 6) return;
    const position = player.cards.indexOf(card);
    if (position < 0) return;
    player.cards.splice(position, 1);
    player.lastAction = "Carta scartata";
    this.log(`${player.name} ha completato lo scarto.`);
    if (this.table.players.every(entry => entry.cards.length === 5)) {
      // Regolamento: il primo giro di puntata avviene prima di scoprire il flop.
      this.table.phase = "preflop";
      this.table.roundMaxBet = 0;
      this.table.roundRaises = 0;
      this.table.turnIndex = -1;
      this.log("Scarto completato. Puntata pre-board.");
      this.emit("preflop-open");
      this.openBettingAfterReveal(600);
    } else {
      this.emit("card-discarded");
    }
  }

  humanDiscard(card: CardCode) {
    if (this.table.phase !== "discard") return;
    this.discard(0, card);
    this.continueAutomation();
  }

  private performAction(
    playerIndex: number,
    action: PokerAction,
    raiseTo?: number
  ) {
    const player = this.table.players[playerIndex];
    if (!player || player.folded || playerIndex !== this.table.turnIndex)
      return;
    if (action === "fold") {
      player.folded = true;
      player.acted = true;
      player.lastAction = "Fold";
      this.log(`${player.name} passa.`);
    } else if (action === "check") {
      if (player.roundBet !== this.table.roundMaxBet) {
        this.performAction(playerIndex, "call");
        return;
      }
      player.acted = true;
      player.lastAction = "Check";
      this.log(`${player.name} fa check.`);
    } else if (action === "call") {
      const amount = Math.min(
        this.table.roundMaxBet - player.roundBet,
        player.chips
      );
      player.chips -= amount;
      player.roundBet += amount;
      this.table.pot += amount;
      player.allIn = player.chips === 0;
      player.acted = true;
      player.lastAction = amount ? `Call ${amount}` : "Check";
      this.log(
        amount ? `${player.name} chiama ${amount}.` : `${player.name} fa check.`
      );
    } else if (action === "raise") {
      const previousMax = this.table.roundMaxBet;
      const available = player.chips + player.roundBet;
      const target = Math.min(
        available,
        Math.max(raiseTo ?? 0, previousMax + this.table.bigBlind)
      );
      const amount = Math.min(target - player.roundBet, player.chips);
      player.chips -= amount;
      player.roundBet += amount;
      this.table.pot += amount;
      player.allIn = player.chips === 0;
      const isFullRaise = player.roundBet > previousMax;
      this.table.roundMaxBet = Math.max(previousMax, player.roundBet);
      if (isFullRaise) {
        this.table.roundRaises += 1;
        this.table.players.forEach(entry => {
          if (entry.id !== player.id && !entry.folded && !entry.allIn)
            entry.acted = false;
        });
      }
      player.acted = true;
      player.lastAction = isFullRaise
        ? `Raise ${player.roundBet}`
        : `Call ${amount}`;
      this.log(
        isFullRaise
          ? `${player.name} rilancia a ${player.roundBet}.`
          : `${player.name} chiama ${amount} ed è all-in.`
      );
    } else {
      const amount = player.chips;
      player.roundBet += amount;
      this.table.pot += amount;
      player.chips = 0;
      player.allIn = true;
      if (player.roundBet > this.table.roundMaxBet) {
        this.table.roundMaxBet = player.roundBet;
        this.table.roundRaises += 1;
        this.table.players.forEach(entry => {
          if (entry.id !== player.id && !entry.folded && !entry.allIn)
            entry.acted = false;
        });
      }
      player.acted = true;
      player.lastAction = `All-in ${player.roundBet}`;
      this.log(`${player.name} va all-in.`);
    }

    const survivors = this.table.players.filter(entry => !entry.folded);
    if (survivors.length === 1) {
      const potTotal = this.table.pot;
      survivors[0].chips += potTotal;
      this.table.lastResult = {
        potTotal,
        pot1Winners: [survivors[0].name],
        pot2Winners: [survivors[0].name],
        bestPot1: "Vittoria per fold",
        bestPot2: "Vittoria per fold",
        payouts: { [survivors[0].id]: potTotal },
        splitRule: "solo",
      };
      this.table.pot = 0;
      this.table.status = "waiting";
      this.table.phase = "waiting";
      this.table.revealAll = false;
      this.table.turnIndex = -1;
      this.log(`${survivors[0].name} prende l’intero piatto.`);
      this.emit("winner");
      return;
    }
    if (this.roundComplete()) {
      this.advancePhase();
      return;
    }
    this.table.turnIndex = this.nextActiveIndex(this.table.turnIndex);
    this.emit(action === "fold" ? "fold" : "chips-to-pot");
  }

  humanAction(action: PokerAction, raiseTo?: number) {
    if (this.table.turnIndex !== 0 || this.table.players[0].folded) return;
    this.performAction(0, action, raiseTo);
    this.continueAutomation();
  }

  private advancePhase() {
    this.table.players.forEach(player => {
      player.roundBet = 0;
      player.acted = player.folded || player.allIn;
    });
    this.table.roundMaxBet = 0;
    this.table.roundRaises = 0;
    this.table.turnIndex = -1;
    const order: Phase[] = [
      "preflop",
      "flop",
      "turn",
      "river",
      "pot2",
      "showdown",
    ];
    this.table.phase = order[order.indexOf(this.table.phase) + 1];
    if (this.table.phase === "flop") {
      this.table.board1Revealed = 3;
      this.log("Flop scoperto. Secondo giro di puntate.");
      this.emit("reveal-flop");
      this.openBettingAfterReveal(760);
    } else if (this.table.phase === "turn") {
      this.table.board1Revealed = 5;
      this.log("Turn scoperto: cinque carte sul Piatto 1.");
      this.emit("reveal-turn");
      this.openBettingAfterReveal(650);
    } else if (this.table.phase === "river") {
      this.table.board1Revealed = 6;
      this.log("River scoperto: Piatto 1 completo.");
      this.emit("reveal-river");
      this.openBettingAfterReveal(540);
    } else if (this.table.phase === "pot2") {
      this.table.board2Revealed = true;
      this.log("Piatto 2 scoperto. Ultimo giro di puntate.");
      this.emit("reveal-pot2");
      this.openBettingAfterReveal(680);
    } else if (this.table.phase === "showdown") {
      this.showdown();
      return;
    }
  }

  private showdown() {
    const alive = this.table.players.filter(player => !player.folded);
    const potTotal = this.table.pot;
    const settlement = settleShowdown(
      alive.map(player => ({ id: player.id, cards: player.cards })),
      this.table.board1,
      this.table.board2,
      potTotal,
      this.table.variant
    );
    const nameOf = (id: string) =>
      this.table.players.find(player => player.id === id)?.name ?? id;
    this.table.players.forEach(player => {
      const amount = settlement.payouts[player.id] || 0;
      player.chips += amount;
      if (amount) player.lastAction = `Vince ${amount}`;
    });
    this.table.lastResult = {
      potTotal,
      pot1Winners: settlement.pot1Winners.map(nameOf),
      pot2Winners: settlement.pot2Winners.map(nameOf),
      bestPot1: settlement.bestPot1.label,
      bestPot2: settlement.bestPot2.label,
      payouts: settlement.payouts,
      splitRule: settlement.splitRule,
    };
    const bestPot1 = settlement.bestPot1;
    const bestPot2 = settlement.bestPot2;
    const splitRule = settlement.splitRule;
    this.table.pot = 0;
    this.table.status = "waiting";
    this.table.phase = "waiting";
    this.table.turnIndex = -1;
    this.table.revealAll = true;
    this.log(
      `Showdown: ${bestPot1.label} / ${bestPot2.label}. Divisione ${splitRule}.`
    );
    this.emit("showdown");
  }

  private continueAutomation() {
    if (this.table.status !== "playing") return;
    if (this.table.phase === "blinds") {
      this.later(() => this.stepBlind(), 360);
      return;
    }
    if (this.table.phase === "discard") {
      const botIndex = this.table.players.findIndex(
        player => player.isBot && player.cards.length === 6
      );
      if (botIndex >= 0) {
        this.later(
          () => {
            const bot = this.table.players[botIndex];
            this.discard(
              botIndex,
              botChooseDiscard(bot.cards, this.table.variant)
            );
            this.continueAutomation();
          },
          520 + Math.random() * 260
        );
      } else if (this.demo && this.table.players[0].cards.length === 6) {
        this.later(() => {
          const human = this.table.players[0];
          this.discard(0, botChooseDiscard(human.cards, this.table.variant));
          this.continueAutomation();
        }, 560);
      }
      return;
    }
    if (
      !["preflop", "flop", "turn", "river", "pot2"].includes(this.table.phase)
    )
      return;
    const player = this.table.players[this.table.turnIndex];
    if (!player) return;
    if (player.isBot || this.demo) {
      this.later(
        () => {
          const decision = botDecision(this.table, this.table.turnIndex);
          this.performAction(
            this.table.turnIndex,
            decision.action,
            decision.raiseTo
          );
          this.continueAutomation();
        },
        720 + Math.random() * 520
      );
    }
  }

  dispose() {
    this.disposed = true;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
    this.listeners.clear();
  }
}
