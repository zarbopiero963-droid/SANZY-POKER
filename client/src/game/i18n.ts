/**
 * Sanzy Poker Pro — internazionalizzazione (IT/EN/ES/FR).
 *
 * Modulo puro, indipendente dal framework: sia la GUI Babylon (`ui.ts`) sia la
 * macchina a stati (`state.ts`) sia il flusso React d'ingresso usano lo stesso
 * `t()`. NON contiene logica di gioco: traduce solo le ETICHETTE mostrate.
 *
 * `describeHand()` localizza i nomi delle combinazioni a partire dai campi
 * strutturati di `HandEvaluation` (categoria, rango, seme, livello scala) SENZA
 * modificare `rules.ts`: la `label` italiana interna resta la forma canonica
 * usata dai test, mentre il rendering usa questa descrizione tradotta.
 */

import { CATS, type HandEvaluation, type Suit } from "./rules";

export type Locale = "it" | "en" | "es" | "fr";

export const LOCALES: Locale[] = ["it", "en", "es", "fr"];

/** Nome della lingua nella lingua stessa, per il selettore iniziale. */
export const LOCALE_NAMES: Record<Locale, string> = {
  it: "Italiano",
  en: "English",
  es: "Español",
  fr: "Français",
};

/** Emoji bandiera per il selettore (solo decorativa). */
export const LOCALE_FLAG: Record<Locale, string> = {
  it: "🇮🇹",
  en: "🇬🇧",
  es: "🇪🇸",
  fr: "🇫🇷",
};

/** BCP-47 per la formattazione dei numeri (separatore delle migliaia). */
export const LOCALE_TAG: Record<Locale, string> = {
  it: "it-IT",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
};

const DEFAULT_LOCALE: Locale = "it";
let current: Locale = DEFAULT_LOCALE;

export function getLocale(): Locale {
  return current;
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as string[]).includes(value);
}

export function setLocale(locale: Locale): void {
  current = isLocale(locale) ? locale : DEFAULT_LOCALE;
}

type Dict = Record<string, string>;

// Termini poker universali (FOLD/CHECK/CALL/RAISE/ALL-IN, FLOP/TURN/RIVER, P1/P2)
// restano invariati in tutte le lingue perché idiomatici anche in IT/ES/FR.
const IT: Dict = {
  // Flusso d'ingresso
  "start.chooseLanguage": "Scegli la lingua",
  "start.chooseVariant": "Scegli la variante",
  "start.tagline": "Due piatti, una sola lettura",
  "start.play": "GIOCA",
  "start.change": "Cambia",
  "brand.name": "Sanzy Poker",
  "brand.sanzy": "SANZY",
  "brand.poker": "POKER",
  "loader.preparing": "Preparazione del tavolo…",
  "variant.standard.name": "Standard",
  "variant.hilow.name": "Hi/Low",
  "variant.standard.desc":
    "Le parità dividono il piatto. Nessun seme, nessun kicker.",
  "variant.hilow.desc": "Lo spareggio usa il seme della carta più alta.",
  // Barra tavolo
  "table.live": "●  PARTITA LIVE",
  "table.liveShort": "● LIVE",
  "meta.hand": "MANO {n}",
  "room.standard": "Sala Smeraldo",
  "room.hilow": "Sala Aurora",
  // Fasi
  "phase.title": "SVOLGIMENTO",
  "phase.blinds": "Bui",
  "phase.discard": "Scarto",
  "phase.preflop": "Pre-board",
  "phase.flop": "Flop",
  "phase.turn": "Turn",
  "phase.river": "River",
  "phase.pot2": "Piatto 2",
  "phaseShort.blinds": "BUI",
  "phaseShort.discard": "SCARTO",
  "phaseShort.preflop": "PRE",
  "phaseShort.flop": "FLOP",
  "phaseShort.turn": "TURN",
  "phaseShort.river": "RIVER",
  "phaseShort.pot2": "P2",
  // Log azioni
  "log.title": "AZIONI",
  "log.tableReady": "Tavolo pronto. I bot stanno prendendo posto.",
  "log.handStart": "Mano {n}. Bottone a {name}.",
  "log.blindsDone": "Buio completato. Ogni giocatore scarta una carta.",
  "log.postBlind": "{name} versa {n} nel piatto.",
  "log.fold": "{name} passa.",
  "log.check": "{name} fa check.",
  "log.call": "{name} chiama {n}.",
  "log.raise": "{name} rilancia a {n}.",
  "log.callAllIn": "{name} chiama {n} ed è all-in.",
  "log.allIn": "{name} va all-in.",
  "log.discardDone": "{name} ha completato lo scarto.",
  "log.discardPhaseDone": "Scarto completato. Puntata pre-board.",
  "log.flop": "Flop scoperto. Secondo giro di puntate.",
  "log.turn": "Turn scoperto: cinque carte sul Piatto 1.",
  "log.river": "River scoperto: Piatto 1 completo.",
  "log.pot2": "Piatto 2 scoperto. Ultimo giro di puntate.",
  "log.takesPot": "{name} prende l’intero piatto.",
  "log.showdown": "Showdown: {a} / {b}. Divisione {rule}.",
  // Badge azione al posto
  "act.ready": "Pronto",
  "act.waiting": "In attesa",
  "act.dealt": "Carte ricevute",
  "act.blind": "Buio {n}",
  "act.fold": "Fold",
  "act.check": "Check",
  "act.call": "Call {n}",
  "act.raise": "Raise {n}",
  "act.allin": "All-in {n}",
  "act.wins": "Vince {n}",
  "act.discarded": "Carta scartata",
  "act.foldBadge": "FOLD",
  // Board
  "board.p1": "BOARD · PIATTO 1",
  "board.p2": "PIATTO 2",
  "board.p1short": "P1  ·  3 + 2 + 1",
  "board.p2short": "P2  ·  2",
  "pot.label": "PIATTO  {n}",
  "chips.unit": "chip",
  // Azioni umano
  "panel.actions": "AZIONI",
  "turn.yours": "TOCCA A TE",
  "action.callN": "CALL {n}",
  "action.raiseN": "RAISE {n}",
  "action.fold": "FOLD",
  "action.check": "CHECK",
  "action.allin": "ALL-IN",
  "action.raise": "RAISE",
  "bet.amount": "Puntata: {n}",
  "waiting.ready": "Tavolo pronto",
  "waiting.done": "Mano completata",
  "button.play": "GIOCA",
  "button.newHand": "NUOVA MANO",
  "button.continue": "CONTINUA",
  "discard.hint": "SCARTO: SELEZIONA UNA CARTA",
  "discard.hintMobile": "SCARTO · TOCCA UNA CARTA",
  "decision.timer": "●  DECISIONE  18s",
  "decision.thinking": "{name} sta pensando…",
  "decision.thinkingShort": "{name} pensa…",
  "dealer.fallback": "Dealer",
  // Showdown
  "result.showdown": "SHOWDOWN",
  "result.solo": "VINCITORE UNICO",
  "result.split": "PIATTI 50 / 50",
  "result.splitShort": "50 / 50",
  "result.titleSplit": "DIVISIONE 50 / 50",
  "result.pot1": "PIATTO 1",
  "result.pot2": "PIATTO 2",
  "result.foldWin": "Vittoria per fold",
  // Descrizione mani
  "suit.hearts": "cuori",
  "suit.diamonds": "quadri",
  "suit.clubs": "fiori",
  "suit.spades": "picche",
  "straight.level1": "Scala minima",
  "straight.level2": "Scala media",
  "straight.level3": "Scala massima",
  "hand.straightFlush": "{straight} di {suit}",
  "hand.quads": "Poker di {rank}",
  "hand.flush": "Colore di {suit}",
  "hand.full": "Full di {rank}",
  "hand.straight": "{straight}",
  "hand.trips": "Tris di {rank}",
  "hand.twoPair": "Doppia coppia",
  "hand.pair": "Coppia di {rank}",
  "hand.high": "Carta alta",
};

const EN: Dict = {
  "start.chooseLanguage": "Choose your language",
  "start.chooseVariant": "Choose the variant",
  "start.tagline": "Two pots, one read",
  "start.play": "PLAY",
  "start.change": "Change",
  "brand.name": "Sanzy Poker",
  "brand.sanzy": "SANZY",
  "brand.poker": "POKER",
  "loader.preparing": "Preparing the table…",
  "variant.standard.name": "Standard",
  "variant.hilow.name": "Hi/Low",
  "variant.standard.desc": "Ties split the pot. No suits, no kickers.",
  "variant.hilow.desc": "Ties are broken by the suit of the highest card.",
  "table.live": "●  LIVE GAME",
  "table.liveShort": "● LIVE",
  "meta.hand": "HAND {n}",
  "room.standard": "Emerald Room",
  "room.hilow": "Aurora Room",
  "phase.title": "FLOW",
  "phase.blinds": "Blinds",
  "phase.discard": "Discard",
  "phase.preflop": "Pre-board",
  "phase.flop": "Flop",
  "phase.turn": "Turn",
  "phase.river": "River",
  "phase.pot2": "Pot 2",
  "phaseShort.blinds": "BLIND",
  "phaseShort.discard": "DISC.",
  "phaseShort.preflop": "PRE",
  "phaseShort.flop": "FLOP",
  "phaseShort.turn": "TURN",
  "phaseShort.river": "RIVER",
  "phaseShort.pot2": "P2",
  "log.title": "ACTIONS",
  "log.tableReady": "Table ready. Bots are taking their seats.",
  "log.handStart": "Hand {n}. Button on {name}.",
  "log.blindsDone": "Blinds posted. Each player discards a card.",
  "log.postBlind": "{name} posts {n} to the pot.",
  "log.fold": "{name} folds.",
  "log.check": "{name} checks.",
  "log.call": "{name} calls {n}.",
  "log.raise": "{name} raises to {n}.",
  "log.callAllIn": "{name} calls {n} and is all-in.",
  "log.allIn": "{name} goes all-in.",
  "log.discardDone": "{name} has discarded.",
  "log.discardPhaseDone": "Discard done. Pre-board betting.",
  "log.flop": "Flop revealed. Second betting round.",
  "log.turn": "Turn revealed: five cards on Pot 1.",
  "log.river": "River revealed: Pot 1 complete.",
  "log.pot2": "Pot 2 revealed. Final betting round.",
  "log.takesPot": "{name} takes the whole pot.",
  "log.showdown": "Showdown: {a} / {b}. Split {rule}.",
  "act.ready": "Ready",
  "act.waiting": "Waiting",
  "act.dealt": "Cards dealt",
  "act.blind": "Blind {n}",
  "act.fold": "Fold",
  "act.check": "Check",
  "act.call": "Call {n}",
  "act.raise": "Raise {n}",
  "act.allin": "All-in {n}",
  "act.wins": "Wins {n}",
  "act.discarded": "Card discarded",
  "act.foldBadge": "FOLD",
  "board.p1": "BOARD · POT 1",
  "board.p2": "POT 2",
  "board.p1short": "P1  ·  3 + 2 + 1",
  "board.p2short": "P2  ·  2",
  "pot.label": "POT  {n}",
  "chips.unit": "chips",
  "panel.actions": "ACTIONS",
  "turn.yours": "YOUR TURN",
  "action.callN": "CALL {n}",
  "action.raiseN": "RAISE {n}",
  "action.fold": "FOLD",
  "action.check": "CHECK",
  "action.allin": "ALL-IN",
  "action.raise": "RAISE",
  "bet.amount": "Bet: {n}",
  "waiting.ready": "Table ready",
  "waiting.done": "Hand complete",
  "button.play": "PLAY",
  "button.newHand": "NEW HAND",
  "button.continue": "CONTINUE",
  "discard.hint": "DISCARD: SELECT A CARD",
  "discard.hintMobile": "DISCARD · TAP A CARD",
  "decision.timer": "●  DECISION  18s",
  "decision.thinking": "{name} is thinking…",
  "decision.thinkingShort": "{name} thinks…",
  "dealer.fallback": "Dealer",
  "result.showdown": "SHOWDOWN",
  "result.solo": "SINGLE WINNER",
  "result.split": "POTS 50 / 50",
  "result.splitShort": "50 / 50",
  "result.titleSplit": "50 / 50 SPLIT",
  "result.pot1": "POT 1",
  "result.pot2": "POT 2",
  "result.foldWin": "Win by fold",
  "suit.hearts": "hearts",
  "suit.diamonds": "diamonds",
  "suit.clubs": "clubs",
  "suit.spades": "spades",
  "straight.level1": "Low straight",
  "straight.level2": "Middle straight",
  "straight.level3": "High straight",
  "hand.straightFlush": "{straight}, {suit}",
  "hand.quads": "Four of a kind, {rank}",
  "hand.flush": "Flush, {suit}",
  "hand.full": "Full house, {rank}",
  "hand.straight": "{straight}",
  "hand.trips": "Three of a kind, {rank}",
  "hand.twoPair": "Two pair",
  "hand.pair": "Pair of {rank}",
  "hand.high": "High card",
};

const ES: Dict = {
  "start.chooseLanguage": "Elige el idioma",
  "start.chooseVariant": "Elige la variante",
  "start.tagline": "Dos botes, una sola lectura",
  "start.play": "JUGAR",
  "start.change": "Cambiar",
  "brand.name": "Sanzy Poker",
  "brand.sanzy": "SANZY",
  "brand.poker": "POKER",
  "loader.preparing": "Preparando la mesa…",
  "variant.standard.name": "Standard",
  "variant.hilow.name": "Hi/Low",
  "variant.standard.desc":
    "Los empates reparten el bote. Sin palos, sin kickers.",
  "variant.hilow.desc": "El desempate usa el palo de la carta más alta.",
  "table.live": "●  PARTIDA EN VIVO",
  "table.liveShort": "● LIVE",
  "meta.hand": "MANO {n}",
  "room.standard": "Sala Esmeralda",
  "room.hilow": "Sala Aurora",
  "phase.title": "DESARROLLO",
  "phase.blinds": "Ciegas",
  "phase.discard": "Descarte",
  "phase.preflop": "Pre-board",
  "phase.flop": "Flop",
  "phase.turn": "Turn",
  "phase.river": "River",
  "phase.pot2": "Bote 2",
  "phaseShort.blinds": "CIEG.",
  "phaseShort.discard": "DESC.",
  "phaseShort.preflop": "PRE",
  "phaseShort.flop": "FLOP",
  "phaseShort.turn": "TURN",
  "phaseShort.river": "RIVER",
  "phaseShort.pot2": "B2",
  "log.title": "ACCIONES",
  "log.tableReady": "Mesa lista. Los bots se están sentando.",
  "log.handStart": "Mano {n}. Botón para {name}.",
  "log.blindsDone": "Ciegas puestas. Cada jugador descarta una carta.",
  "log.postBlind": "{name} pone {n} en el bote.",
  "log.fold": "{name} se retira.",
  "log.check": "{name} pasa.",
  "log.call": "{name} iguala {n}.",
  "log.raise": "{name} sube a {n}.",
  "log.callAllIn": "{name} iguala {n} y va all-in.",
  "log.allIn": "{name} va all-in.",
  "log.discardDone": "{name} ha descartado.",
  "log.discardPhaseDone": "Descarte hecho. Apuesta pre-board.",
  "log.flop": "Flop descubierto. Segunda ronda de apuestas.",
  "log.turn": "Turn descubierto: cinco cartas en el Bote 1.",
  "log.river": "River descubierto: Bote 1 completo.",
  "log.pot2": "Bote 2 descubierto. Última ronda de apuestas.",
  "log.takesPot": "{name} se lleva todo el bote.",
  "log.showdown": "Showdown: {a} / {b}. Reparto {rule}.",
  "act.ready": "Listo",
  "act.waiting": "Esperando",
  "act.dealt": "Cartas repartidas",
  "act.blind": "Ciega {n}",
  "act.fold": "Fold",
  "act.check": "Check",
  "act.call": "Call {n}",
  "act.raise": "Raise {n}",
  "act.allin": "All-in {n}",
  "act.wins": "Gana {n}",
  "act.discarded": "Carta descartada",
  "act.foldBadge": "FOLD",
  "board.p1": "BOARD · BOTE 1",
  "board.p2": "BOTE 2",
  "board.p1short": "B1  ·  3 + 2 + 1",
  "board.p2short": "B2  ·  2",
  "pot.label": "BOTE  {n}",
  "chips.unit": "fichas",
  "panel.actions": "ACCIONES",
  "turn.yours": "TU TURNO",
  "action.callN": "CALL {n}",
  "action.raiseN": "RAISE {n}",
  "action.fold": "FOLD",
  "action.check": "CHECK",
  "action.allin": "ALL-IN",
  "action.raise": "RAISE",
  "bet.amount": "Apuesta: {n}",
  "waiting.ready": "Mesa lista",
  "waiting.done": "Mano completada",
  "button.play": "JUGAR",
  "button.newHand": "NUEVA MANO",
  "button.continue": "CONTINUAR",
  "discard.hint": "DESCARTE: ELIGE UNA CARTA",
  "discard.hintMobile": "DESCARTE · TOCA UNA CARTA",
  "decision.timer": "●  DECISIÓN  18s",
  "decision.thinking": "{name} está pensando…",
  "decision.thinkingShort": "{name} piensa…",
  "dealer.fallback": "Dealer",
  "result.showdown": "SHOWDOWN",
  "result.solo": "GANADOR ÚNICO",
  "result.split": "BOTES 50 / 50",
  "result.splitShort": "50 / 50",
  "result.titleSplit": "REPARTO 50 / 50",
  "result.pot1": "BOTE 1",
  "result.pot2": "BOTE 2",
  "result.foldWin": "Victoria por retiro",
  "suit.hearts": "corazones",
  "suit.diamonds": "diamantes",
  "suit.clubs": "tréboles",
  "suit.spades": "picas",
  "straight.level1": "Escalera mínima",
  "straight.level2": "Escalera media",
  "straight.level3": "Escalera máxima",
  "hand.straightFlush": "{straight} de {suit}",
  "hand.quads": "Póker de {rank}",
  "hand.flush": "Color de {suit}",
  "hand.full": "Full de {rank}",
  "hand.straight": "{straight}",
  "hand.trips": "Trío de {rank}",
  "hand.twoPair": "Doble pareja",
  "hand.pair": "Pareja de {rank}",
  "hand.high": "Carta alta",
};

const FR: Dict = {
  "start.chooseLanguage": "Choisis la langue",
  "start.chooseVariant": "Choisis la variante",
  "start.tagline": "Deux pots, une seule lecture",
  "start.play": "JOUER",
  "start.change": "Changer",
  "brand.name": "Sanzy Poker",
  "brand.sanzy": "SANZY",
  "brand.poker": "POKER",
  "loader.preparing": "Préparation de la table…",
  "variant.standard.name": "Standard",
  "variant.hilow.name": "Hi/Low",
  "variant.standard.desc":
    "Les égalités partagent le pot. Sans couleur, sans kicker.",
  "variant.hilow.desc":
    "L’égalité se départage par la couleur de la carte la plus haute.",
  "table.live": "●  PARTIE LIVE",
  "table.liveShort": "● LIVE",
  "meta.hand": "MAIN {n}",
  "room.standard": "Salle Émeraude",
  "room.hilow": "Salle Aurore",
  "phase.title": "DÉROULÉ",
  "phase.blinds": "Blinds",
  "phase.discard": "Écart",
  "phase.preflop": "Pré-board",
  "phase.flop": "Flop",
  "phase.turn": "Turn",
  "phase.river": "River",
  "phase.pot2": "Pot 2",
  "phaseShort.blinds": "BLIND",
  "phaseShort.discard": "ÉCART",
  "phaseShort.preflop": "PRE",
  "phaseShort.flop": "FLOP",
  "phaseShort.turn": "TURN",
  "phaseShort.river": "RIVER",
  "phaseShort.pot2": "P2",
  "log.title": "ACTIONS",
  "log.tableReady": "Table prête. Les bots prennent place.",
  "log.handStart": "Main {n}. Bouton sur {name}.",
  "log.blindsDone": "Blinds versées. Chaque joueur écarte une carte.",
  "log.postBlind": "{name} verse {n} au pot.",
  "log.fold": "{name} se couche.",
  "log.check": "{name} checke.",
  "log.call": "{name} suit {n}.",
  "log.raise": "{name} relance à {n}.",
  "log.callAllIn": "{name} suit {n} et fait tapis.",
  "log.allIn": "{name} fait tapis.",
  "log.discardDone": "{name} a écarté.",
  "log.discardPhaseDone": "Écart terminé. Mise pré-board.",
  "log.flop": "Flop dévoilé. Deuxième tour d’enchères.",
  "log.turn": "Turn dévoilé : cinq cartes au Pot 1.",
  "log.river": "River dévoilé : Pot 1 complet.",
  "log.pot2": "Pot 2 dévoilé. Dernier tour d’enchères.",
  "log.takesPot": "{name} rafle tout le pot.",
  "log.showdown": "Showdown : {a} / {b}. Partage {rule}.",
  "act.ready": "Prêt",
  "act.waiting": "En attente",
  "act.dealt": "Cartes reçues",
  "act.blind": "Blind {n}",
  "act.fold": "Fold",
  "act.check": "Check",
  "act.call": "Call {n}",
  "act.raise": "Raise {n}",
  "act.allin": "All-in {n}",
  "act.wins": "Gagne {n}",
  "act.discarded": "Carte écartée",
  "act.foldBadge": "FOLD",
  "board.p1": "BOARD · POT 1",
  "board.p2": "POT 2",
  "board.p1short": "P1  ·  3 + 2 + 1",
  "board.p2short": "P2  ·  2",
  "pot.label": "POT  {n}",
  "chips.unit": "jetons",
  "panel.actions": "ACTIONS",
  "turn.yours": "À TOI",
  "action.callN": "CALL {n}",
  "action.raiseN": "RAISE {n}",
  "action.fold": "FOLD",
  "action.check": "CHECK",
  "action.allin": "ALL-IN",
  "action.raise": "RAISE",
  "bet.amount": "Mise : {n}",
  "waiting.ready": "Table prête",
  "waiting.done": "Main terminée",
  "button.play": "JOUER",
  "button.newHand": "NOUVELLE MAIN",
  "button.continue": "CONTINUER",
  "discard.hint": "ÉCART : CHOISIS UNE CARTE",
  "discard.hintMobile": "ÉCART · TOUCHE UNE CARTE",
  "decision.timer": "●  DÉCISION  18s",
  "decision.thinking": "{name} réfléchit…",
  "decision.thinkingShort": "{name} réfléchit…",
  "dealer.fallback": "Dealer",
  "result.showdown": "SHOWDOWN",
  "result.solo": "VAINQUEUR UNIQUE",
  "result.split": "POTS 50 / 50",
  "result.splitShort": "50 / 50",
  "result.titleSplit": "PARTAGE 50 / 50",
  "result.pot1": "POT 1",
  "result.pot2": "POT 2",
  "result.foldWin": "Victoire par abandon",
  "suit.hearts": "cœur",
  "suit.diamonds": "carreau",
  "suit.clubs": "trèfle",
  "suit.spades": "pique",
  "straight.level1": "Quinte basse",
  "straight.level2": "Quinte moyenne",
  "straight.level3": "Quinte haute",
  "hand.straightFlush": "{straight} à {suit}",
  "hand.quads": "Carré de {rank}",
  "hand.flush": "Couleur à {suit}",
  "hand.full": "Full aux {rank}",
  "hand.straight": "{straight}",
  "hand.trips": "Brelan de {rank}",
  "hand.twoPair": "Deux paires",
  "hand.pair": "Paire de {rank}",
  "hand.high": "Carte haute",
};

const DICT: Record<Locale, Dict> = { it: IT, en: EN, es: ES, fr: FR };

/**
 * Traduce `key` nella lingua corrente (o in `locale`), sostituendo i
 * segnaposto `{param}`. Ripiega sull'italiano e poi sulla chiave stessa se una
 * traduzione manca, così l'interfaccia non mostra mai vuoti.
 */
export function t(
  key: string,
  params?: Record<string, string | number>,
  locale: Locale = current
): string {
  const table = DICT[locale] ?? DICT.it;
  let value = table[key] ?? DICT.it[key] ?? key;
  if (params) {
    for (const [name, replacement] of Object.entries(params)) {
      value = value.split(`{${name}}`).join(String(replacement));
    }
  }
  return value;
}

/** Formatta un intero coi separatori di migliaia della lingua corrente. */
export function formatChips(amount: number, locale: Locale = current): string {
  return Math.round(amount).toLocaleString(LOCALE_TAG[locale]);
}

const RANK_BY_VALUE = ["7", "8", "9", "10", "J", "Q", "K", "A"] as const;
const SUIT_KEY: Record<Suit, string> = {
  H: "hearts",
  D: "diamonds",
  C: "clubs",
  S: "spades",
};

export function suitName(suit: Suit, locale: Locale = current): string {
  return t(`suit.${SUIT_KEY[suit]}`, undefined, locale);
}

function rankLabel(value: number | undefined): string {
  if (value == null || value < 0 || value >= RANK_BY_VALUE.length) return "";
  return RANK_BY_VALUE[value];
}

function straightName(level: number | undefined, locale: Locale): string {
  return t(`straight.level${level ?? 2}`, undefined, locale);
}

/**
 * Descrizione localizzata di una combinazione a partire dai suoi campi
 * strutturati. Riflette la stessa struttura di `rules.ts` senza dipendere dalla
 * `label` italiana canonica: i test continuano a usare `category`/`label`.
 */
export function describeHand(
  ev: HandEvaluation,
  locale: Locale = current
): string {
  switch (ev.category) {
    case CATS.STRAIGHT_FLUSH:
      return t(
        "hand.straightFlush",
        {
          straight: straightName(ev.level, locale),
          suit: suitName(ev.suit!, locale),
        },
        locale
      );
    case CATS.QUADS:
      return t("hand.quads", { rank: rankLabel(ev.rank) }, locale);
    case CATS.FLUSH:
      return t("hand.flush", { suit: suitName(ev.suit!, locale) }, locale);
    case CATS.FULL_HOUSE:
      return t("hand.full", { rank: rankLabel(ev.tripRank) }, locale);
    case CATS.STRAIGHT:
      return t(
        "hand.straight",
        { straight: straightName(ev.level, locale) },
        locale
      );
    case CATS.TRIPS:
      return t("hand.trips", { rank: rankLabel(ev.rank) }, locale);
    case CATS.TWO_PAIR:
      return t("hand.twoPair", undefined, locale);
    case CATS.PAIR:
      return t("hand.pair", { rank: rankLabel(ev.rank) }, locale);
    default:
      return t("hand.high", undefined, locale);
  }
}

/** Elenco delle chiavi definite per l'italiano (per i test di completezza). */
export function itKeys(): string[] {
  return Object.keys(IT);
}

export function dictFor(locale: Locale): Dict {
  return DICT[locale];
}
