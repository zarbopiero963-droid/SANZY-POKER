/**
 * Noir Emerald Arena — personalità e decisioni dei bot.
 * Le scelte sono intenzionalmente leggibili e rapide: il tavolo deve sembrare vivo,
 * senza trasformare i bot in avversari perfetti o rallentare il ritmo della demo.
 */

import { bestPot1Hand, bestPot2Hand, compareHands, evaluateHand, type CardCode, type HandEvaluation } from "./rules";
import type { PlayerState, TableState, PokerAction } from "./state";

const BOT_PROFILES = [
  { name: "Nadia", title: "La Calcolatrice", aggression: 1.05, accent: "#49D6B3" },
  { name: "Rico", title: "Il Martello", aggression: 1.28, accent: "#E26D5A" },
  { name: "Mara", title: "Occhio Freddo", aggression: 0.9, accent: "#76A7F4" },
  { name: "Dino", title: "Vecchia Scuola", aggression: 1.12, accent: "#D9B45B" },
  { name: "Iris", title: "La Stratega", aggression: 0.82, accent: "#BF8AF2" },
];

export function createBot(index: number, chips: number): PlayerState {
  const profile = BOT_PROFILES[index % BOT_PROFILES.length];
  return {
    id: `bot-${index + 1}`,
    name: profile.name,
    title: profile.title,
    isBot: true,
    aggression: profile.aggression,
    accent: profile.accent,
    chips,
    cards: [],
    folded: false,
    allIn: false,
    roundBet: 0,
    acted: false,
    paidBlind: false,
    lastAction: "In attesa",
  };
}

export function botChooseDiscard(cards: CardCode[], variant: TableState["variant"]): CardCode {
  let discard = cards[0];
  let best: HandEvaluation | null = null;
  cards.forEach((candidate) => {
    const remaining = cards.filter((card) => card !== candidate);
    const evaluation = evaluateHand(remaining);
    if (!best || compareHands(evaluation, best, variant) > 0) {
      best = evaluation;
      discard = candidate;
    }
  });
  return discard;
}

export function botDecision(table: TableState, playerIndex: number): { action: PokerAction; raiseTo?: number } {
  const player = table.players[playerIndex];
  const board1 = table.board1.slice(0, table.board1Revealed);
  const board2 = table.board2Revealed ? table.board2 : [];
  const pot1 = bestPot1Hand(player.cards, board1, table.variant);
  const pot2 = bestPot2Hand(player.cards, board2, table.variant);
  const strength = Math.max(pot1.category, pot2.category);
  const callAmount = Math.max(0, table.roundMaxBet - player.roundBet);
  const canCheck = callAmount === 0;
  const random = Math.random();
  const stack = player.chips + player.roundBet;
  const raiseTo = Math.min(stack, table.roundMaxBet + table.bigBlind * (2 + Math.floor(random * 3)));
  const canRaise = table.roundRaises === 0 && raiseTo > table.roundMaxBet && player.chips > callAmount + table.bigBlind;

  if (strength >= 5) {
    if (canCheck) return canRaise && random < 0.28 * player.aggression ? { action: "raise", raiseTo } : { action: "check" };
    if (canRaise && random < 0.16 * player.aggression) return { action: "raise", raiseTo };
    return { action: "call" };
  }
  if (strength >= 3) {
    if (canCheck) return canRaise && random < 0.22 * player.aggression ? { action: "raise", raiseTo } : { action: "check" };
    if (callAmount > stack * 0.6) return random < 0.5 ? { action: "call" } : { action: "fold" };
    return canRaise && random < 0.14 * player.aggression ? { action: "raise", raiseTo } : { action: "call" };
  }
  if (strength >= 1) {
    if (canCheck) return { action: "check" };
    if (callAmount <= stack * 0.15) return { action: "call" };
    return random < 0.28 ? { action: "call" } : { action: "fold" };
  }
  if (canCheck) return { action: "check" };
  if (callAmount <= table.bigBlind && random < 0.4) return { action: "call" };
  return { action: "fold" };
}
