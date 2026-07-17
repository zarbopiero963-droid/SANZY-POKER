/**
 * Noir Emerald Arena — regole pure del Sanzy Poker.
 * Il rendering non deve mai entrare in questo modulo: qui vivono solo mazzo,
 * combinazioni, confronti Standard/Hi-Low e selezione delle mani per i due piatti.
 */

export type Variant = "standard" | "hilow";
export type Suit = "H" | "D" | "C" | "S";
export type CardCode = string;

export const RANKS = ["7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export const SUITS: Suit[] = ["H", "D", "C", "S"];
export const SUIT_SYMBOL: Record<Suit, string> = { H: "♥", D: "♦", C: "♣", S: "♠" };
export const SUIT_NAME: Record<Suit, string> = { H: "cuori", D: "quadri", C: "fiori", S: "picche" };
export const SUIT_PRIORITY: Record<Suit, number> = { H: 3, D: 2, C: 1, S: 0 };

const RANK_VALUE: Record<string, number> = { "7": 0, "8": 1, "9": 2, "10": 3, J: 4, Q: 5, K: 6, A: 7 };

const STRAIGHTS = [
  { level: 3, name: "Scala massima", ranks: ["A", "K", "Q", "J", "10"] },
  { level: 2, name: "Scala media", ranks: ["K", "Q", "J", "10", "9"] },
  { level: 2, name: "Scala media", ranks: ["Q", "J", "10", "9", "8"] },
  { level: 2, name: "Scala media", ranks: ["J", "10", "9", "8", "7"] },
  { level: 1, name: "Scala minima", ranks: ["10", "9", "8", "7", "A"] },
] as const;

export const CATS = {
  STRAIGHT_FLUSH: 8,
  QUADS: 7,
  FLUSH: 6,
  FULL_HOUSE: 5,
  STRAIGHT: 4,
  TRIPS: 3,
  TWO_PAIR: 2,
  PAIR: 1,
  HIGH: 0,
} as const;

export type HandEvaluation = {
  category: number;
  label: string;
  level?: number;
  suit?: Suit;
  high?: number;
  rank?: number;
  ranks?: number[];
  tripRank?: number;
  pairRank?: number;
  hi?: number;
  lo?: number;
};

export function freshDeck(): CardCode[] {
  const deck: CardCode[] = [];
  for (const suit of SUITS) for (const rank of RANKS) deck.push(`${rank}${suit}`);
  return deck;
}

export function shuffle<T>(input: T[], random = Math.random): T[] {
  const result = input.slice();
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

export function cardParts(code: CardCode) {
  const suit = code.slice(-1) as Suit;
  const rank = code.slice(0, -1);
  return { rank, suit, symbol: SUIT_SYMBOL[suit], red: suit === "H" || suit === "D", value: RANK_VALUE[rank] };
}

function combinations<T>(items: T[], count: number): T[][] {
  if (count === 0) return [[]];
  if (items.length < count) return [];
  const [head, ...tail] = items;
  return [
    ...combinations(tail, count - 1).map((entry) => [head, ...entry]),
    ...combinations(tail, count),
  ];
}

export function evaluateHand(cardCodes: CardCode[]): HandEvaluation {
  if (cardCodes.length !== 5) throw new Error("Una mano Sanzy deve contenere esattamente 5 carte.");
  const cards = cardCodes.map(cardParts);
  const flushSuit = cards[0].suit;
  const isFlush = cards.every((card) => card.suit === flushSuit);
  const rankSet = cards.map((card) => card.rank).sort().join(",");
  const straightInfo = STRAIGHTS.find((straight) => straight.ranks.slice().sort().join(",") === rankSet);

  const counts: Record<string, number> = {};
  cards.forEach((card) => {
    counts[card.rank] = (counts[card.rank] || 0) + 1;
  });
  const groups = Object.entries(counts)
    .map(([rank, count]) => ({ rank, count, value: RANK_VALUE[rank] }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const sortedDesc = cards.map((card) => card.value).sort((a, b) => b - a);
  const bestSuit = cards.reduce(
    (best, card) => (SUIT_PRIORITY[card.suit] > SUIT_PRIORITY[best] ? card.suit : best),
    cards[0].suit,
  );

  if (isFlush && straightInfo) {
    return {
      category: CATS.STRAIGHT_FLUSH,
      level: straightInfo.level,
      suit: flushSuit,
      high: Math.max(...straightInfo.ranks.map((rank) => (straightInfo.level === 1 && rank === "A" ? -1 : RANK_VALUE[rank]))),
      label: `${straightInfo.name} di ${SUIT_NAME[flushSuit]}`,
    };
  }
  if (groups[0].count === 4) return { category: CATS.QUADS, rank: groups[0].value, label: `Poker di ${groups[0].rank}` };
  if (isFlush) return { category: CATS.FLUSH, suit: flushSuit, ranks: sortedDesc, label: `Colore di ${SUIT_NAME[flushSuit]}` };
  if (groups[0].count === 3 && groups[1]?.count === 2) {
    return {
      category: CATS.FULL_HOUSE,
      tripRank: groups[0].value,
      pairRank: groups[1].value,
      suit: bestSuit,
      label: `Full di ${groups[0].rank}`,
    };
  }
  if (straightInfo) {
    return {
      category: CATS.STRAIGHT,
      level: straightInfo.level,
      high: Math.max(...straightInfo.ranks.map((rank) => (straightInfo.level === 1 && rank === "A" ? -1 : RANK_VALUE[rank]))),
      suit: bestSuit,
      label: straightInfo.name,
    };
  }
  if (groups[0].count === 3) return { category: CATS.TRIPS, rank: groups[0].value, suit: bestSuit, label: `Tris di ${groups[0].rank}` };
  if (groups[0].count === 2 && groups[1]?.count === 2) {
    return {
      category: CATS.TWO_PAIR,
      hi: Math.max(groups[0].value, groups[1].value),
      lo: Math.min(groups[0].value, groups[1].value),
      suit: bestSuit,
      label: "Doppia coppia",
    };
  }
  if (groups[0].count === 2) return { category: CATS.PAIR, rank: groups[0].value, suit: bestSuit, label: `Coppia di ${groups[0].rank}` };
  return { category: CATS.HIGH, ranks: sortedDesc, suit: bestSuit, label: "Carta alta" };
}

export function compareHands(a: HandEvaluation, b: HandEvaluation, variant: Variant): number {
  if (a.category !== b.category) return a.category - b.category;
  const hiLow = variant === "hilow";
  switch (a.category) {
    case CATS.STRAIGHT_FLUSH:
      if (!hiLow) return 0;
      if (a.level !== b.level) return (a.level ?? 0) - (b.level ?? 0);
      if (SUIT_PRIORITY[a.suit!] !== SUIT_PRIORITY[b.suit!]) return SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!];
      return (a.high ?? 0) - (b.high ?? 0);
    case CATS.QUADS:
      return (a.rank ?? 0) - (b.rank ?? 0);
    case CATS.FLUSH:
      if (!hiLow) return 0;
      if (SUIT_PRIORITY[a.suit!] !== SUIT_PRIORITY[b.suit!]) return SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!];
      for (let index = 0; index < 5; index += 1) {
        if (a.ranks![index] !== b.ranks![index]) return a.ranks![index] - b.ranks![index];
      }
      return 0;
    case CATS.FULL_HOUSE:
      if (a.tripRank !== b.tripRank) return (a.tripRank ?? 0) - (b.tripRank ?? 0);
      return hiLow ? SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!] : 0;
    case CATS.STRAIGHT:
      if (a.level !== b.level) return (a.level ?? 0) - (b.level ?? 0);
      if (!hiLow) return 0;
      if (a.high !== b.high) return (a.high ?? 0) - (b.high ?? 0);
      return SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!];
    case CATS.TRIPS:
    case CATS.PAIR:
      if (a.rank !== b.rank) return (a.rank ?? 0) - (b.rank ?? 0);
      return hiLow ? SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!] : 0;
    case CATS.TWO_PAIR:
      if (a.hi !== b.hi) return (a.hi ?? 0) - (b.hi ?? 0);
      if (a.lo !== b.lo) return (a.lo ?? 0) - (b.lo ?? 0);
      return hiLow ? SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!] : 0;
    default:
      for (let index = 0; index < 5; index += 1) {
        if (a.ranks![index] !== b.ranks![index]) return a.ranks![index] - b.ranks![index];
      }
      return hiLow ? SUIT_PRIORITY[a.suit!] - SUIT_PRIORITY[b.suit!] : 0;
  }
}

export function bestOf(hands: HandEvaluation[], variant: Variant): HandEvaluation {
  return hands.slice(1).reduce((best, hand) => (compareHands(hand, best, variant) > 0 ? hand : best), hands[0]);
}

export function bestPot1Hand(personal: CardCode[], board: CardCode[], variant: Variant): HandEvaluation {
  let best: HandEvaluation | null = null;
  for (let personalCount = 1; personalCount <= 5; personalCount += 1) {
    const boardCount = 5 - personalCount;
    for (const handCards of combinations(personal, personalCount)) {
      for (const boardCards of combinations(board, boardCount)) {
        const evaluation = evaluateHand([...handCards, ...boardCards]);
        if (!best || compareHands(evaluation, best, variant) > 0) best = evaluation;
      }
    }
  }
  if (!best) throw new Error("Impossibile comporre la mano del Piatto 1.");
  return best;
}

export function bestPot2Hand(personal: CardCode[], board: CardCode[], variant: Variant): HandEvaluation {
  let best: HandEvaluation | null = null;
  for (let personalCount = 3; personalCount <= 5; personalCount += 1) {
    const boardCount = 5 - personalCount;
    for (const handCards of combinations(personal, personalCount)) {
      for (const boardCards of combinations(board, boardCount)) {
        const evaluation = evaluateHand([...handCards, ...boardCards]);
        if (!best || compareHands(evaluation, best, variant) > 0) best = evaluation;
      }
    }
  }
  if (!best) throw new Error("Impossibile comporre la mano del Piatto 2.");
  return best;
}

