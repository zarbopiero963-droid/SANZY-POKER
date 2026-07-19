/**
 * Test hard sull'internazionalizzazione (IT/EN/ES/FR).
 *
 * Coprono i comportamenti reali del modulo `i18n`:
 *  - completezza: ogni lingua definisce ESATTAMENTE le stesse chiavi
 *    dell'italiano (nessuna traduzione mancante o di troppo);
 *  - `describeHand`: descrizione corretta di ogni categoria in tutte le lingue,
 *    a partire da mani reali valutate da `evaluateHand`;
 *  - interpolazione dei parametri `{n}`/`{name}`;
 *  - invarianza dell'italiano: con la lingua di default le stringhe usate dal
 *    motore restano identiche (regressione bloccata su `result.foldWin`);
 *  - integrazione: un `GameController` creato dopo `setLocale` produce log e
 *    nome tavolo nella lingua scelta, SENZA alterare gettoni o esito.
 */
import { afterEach, describe, expect, it } from "vitest";
import {
  describeHand,
  dictFor,
  formatChips,
  getLocale,
  itKeys,
  LOCALES,
  setLocale,
  t,
  type Locale,
} from "../client/src/game/i18n";
import { evaluateHand, type CardCode } from "../client/src/game/rules";
import { GameController } from "../client/src/game/state";

// L'italiano è lo stato di default condiviso: ogni test lo ripristina per non
// contaminare gli altri file (il motore assume la lingua italiana).
afterEach(() => setLocale("it"));

describe("i18n — completezza dei dizionari", () => {
  const keys = itKeys();

  it("l'italiano definisce un insieme di chiavi non vuoto", () => {
    expect(keys.length).toBeGreaterThan(60);
    expect(new Set(keys).size).toBe(keys.length); // nessun duplicato
  });

  for (const locale of LOCALES) {
    it(`(${locale}) ha esattamente le stesse chiavi dell'italiano`, () => {
      const localeKeys = Object.keys(dictFor(locale)).sort();
      expect(localeKeys).toEqual([...keys].sort());
    });

    it(`(${locale}) non lascia nessuna traduzione vuota`, () => {
      for (const key of keys) {
        expect(dictFor(locale)[key], `${locale}:${key}`).toBeTruthy();
      }
    });
  }
});

describe("i18n — interpolazione dei parametri", () => {
  it("sostituisce {n} e {name} nella lingua richiesta", () => {
    expect(t("act.blind", { n: 25 }, "it")).toBe("Buio 25");
    expect(t("act.blind", { n: 25 }, "en")).toBe("Blind 25");
    expect(t("log.postBlind", { name: "Nadia", n: 50 }, "en")).toBe(
      "Nadia posts 50 to the pot."
    );
    expect(t("log.postBlind", { name: "Nadia", n: 50 }, "fr")).toBe(
      "Nadia verse 50 au pot."
    );
  });

  it("ripiega sull'italiano e poi sulla chiave se la traduzione manca", () => {
    expect(t("chiave.inesistente")).toBe("chiave.inesistente");
  });

  it("i pulsanti azione risolvono in tutte le 4 lingue (niente literal hardcoded)", () => {
    // Convenzione del progetto: termini poker inglesi identici in tutte le
    // lingue (come action.callN/raiseN). Il test blinda che le chiavi esistano
    // e risolvano ovunque, così i pulsanti FOLD/CHECK/ALL-IN/RAISE non tornino
    // stringhe hardcoded fuori da t().
    const expected: Record<string, string> = {
      "action.fold": "FOLD",
      "action.check": "CHECK",
      "action.allin": "ALL-IN",
      "action.raise": "RAISE",
    };
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(expected)) {
        expect(t(key, {}, locale), `${key} (${locale})`).toBe(value);
        // La chiave deve esistere davvero, non ripiegare sul proprio nome.
        expect(t(key, {}, locale)).not.toBe(key);
      }
    }
  });

  it("le chiavi del marchio (brand.*) risolvono via t() in tutte le 4 lingue", () => {
    // SANZY/POKER sono un brand costante: stessi valori in ogni lingua, ma passano
    // comunque da t() così anche il marchio rispetta l'invariante i18n. Il test
    // blinda solo che le chiavi esistano e risolvano (non ispeziona il componente
    // React, quindi non prova l'assenza di literal nel JSX).
    const expected: Record<string, string> = {
      "brand.name": "Sanzy Poker",
      "brand.sanzy": "SANZY",
      "brand.poker": "POKER",
    };
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(expected)) {
        expect(t(key, {}, locale), `${key} (${locale})`).toBe(value);
        expect(t(key, {}, locale)).not.toBe(key);
      }
    }
  });

  it("gli endonimi delle lingue (locale.*) risolvono via t() in tutte le 4 lingue", () => {
    // Il selettore di lingua della StartScreen mostra il nome di ogni lingua nella
    // lingua stessa: sono endonimi costanti, ma passano da t() così anche il
    // selettore non usa literal hardcoded fuori da i18n.
    const expected: Record<string, string> = {
      "locale.it": "Italiano",
      "locale.en": "English",
      "locale.es": "Español",
      "locale.fr": "Français",
    };
    for (const locale of LOCALES) {
      for (const [key, value] of Object.entries(expected)) {
        expect(t(key, {}, locale), `${key} (${locale})`).toBe(value);
        expect(t(key, {}, locale)).not.toBe(key);
      }
    }
  });

  it("formatta i gettoni arrotondando all'intero (separatori dipendono dall'ICU)", () => {
    // In ambiente Node small-ICU i separatori possono mancare: verifichiamo le
    // cifre e l'arrotondamento, non la punteggiatura specifica della lingua.
    const digits = (value: string) => value.replace(/\D/g, "");
    expect(digits(formatChips(5000, "it"))).toBe("5000");
    expect(digits(formatChips(1234567, "en"))).toBe("1234567");
    expect(digits(formatChips(10.7, "fr"))).toBe("11"); // arrotonda
  });
});

// Mani deterministiche, una per categoria, con l'attesa in ogni lingua.
type HandCase = {
  label: string;
  cards: CardCode[];
  expected: Record<Locale, string>;
};

const HAND_CASES: HandCase[] = [
  {
    label: "scala colore massima (picche)",
    cards: ["10S", "JS", "QS", "KS", "AS"],
    expected: {
      it: "Scala massima di picche",
      en: "High straight, spades",
      es: "Escalera máxima de picas",
      fr: "Quinte haute à pique",
    },
  },
  {
    label: "poker di 7",
    cards: ["7H", "7D", "7C", "7S", "AH"],
    expected: {
      it: "Poker di 7",
      en: "Four of a kind, 7",
      es: "Póker de 7",
      fr: "Carré de 7",
    },
  },
  {
    label: "colore di cuori",
    cards: ["7H", "9H", "10H", "QH", "AH"],
    expected: {
      it: "Colore di cuori",
      en: "Flush, hearts",
      es: "Color de corazones",
      fr: "Couleur à cœur",
    },
  },
  {
    label: "full di K",
    cards: ["KH", "KD", "KC", "QH", "QD"],
    expected: {
      it: "Full di K",
      en: "Full house, K",
      es: "Full de K",
      fr: "Full aux K",
    },
  },
  {
    label: "scala media",
    cards: ["KH", "QD", "JC", "10S", "9H"],
    expected: {
      it: "Scala media",
      en: "Middle straight",
      es: "Escalera media",
      fr: "Quinte moyenne",
    },
  },
  {
    label: "tris di 9",
    cards: ["9H", "9D", "9C", "7S", "AH"],
    expected: {
      it: "Tris di 9",
      en: "Three of a kind, 9",
      es: "Trío de 9",
      fr: "Brelan de 9",
    },
  },
  {
    label: "doppia coppia",
    cards: ["KH", "KD", "QC", "QS", "AH"],
    expected: {
      it: "Doppia coppia",
      en: "Two pair",
      es: "Doble pareja",
      fr: "Deux paires",
    },
  },
  {
    label: "coppia di 8",
    cards: ["8H", "8D", "QC", "10S", "AH"],
    expected: {
      it: "Coppia di 8",
      en: "Pair of 8",
      es: "Pareja de 8",
      fr: "Paire de 8",
    },
  },
  {
    label: "carta alta",
    cards: ["7H", "9D", "JC", "QS", "AH"],
    expected: {
      it: "Carta alta",
      en: "High card",
      es: "Carta alta",
      fr: "Carte haute",
    },
  },
];

describe("i18n — describeHand su mani reali (tutte le lingue)", () => {
  for (const testCase of HAND_CASES) {
    it(`${testCase.label} → descrizione corretta nelle 4 lingue`, () => {
      const ev = evaluateHand(testCase.cards);
      for (const locale of LOCALES) {
        expect(describeHand(ev, locale), `${testCase.label} (${locale})`).toBe(
          testCase.expected[locale]
        );
      }
    });
  }

  it("la descrizione non dipende dallo stato globale se si passa la lingua", () => {
    const ev = evaluateHand(["8H", "8D", "QC", "10S", "AH"]);
    setLocale("fr");
    // Anche con lingua globale FR, richiedere ES restituisce lo spagnolo.
    expect(describeHand(ev, "es")).toBe("Pareja de 8");
    expect(describeHand(ev)).toBe("Paire de 8"); // globale = FR
  });
});

describe("i18n — invarianza dell'italiano (regressione motore)", () => {
  it("la lingua di default è l'italiano", () => {
    expect(getLocale()).toBe("it");
  });

  it("le stringhe usate dal motore restano identiche in italiano", () => {
    // engine.test.ts verifica proprio questa stringa nel caso vittoria-per-fold.
    expect(t("result.foldWin")).toBe("Vittoria per fold");
    expect(t("act.fold")).toBe("Fold");
    expect(t("act.check")).toBe("Check");
  });
});

describe("i18n — integrazione con il motore (lingua scelta, gettoni intatti)", () => {
  it("un GameController creato in EN ha log e nome tavolo in inglese", () => {
    setLocale("en");
    const controller = new GameController(false, "standard");
    expect(controller.table.name).toBe("Emerald Room · Standard");
    expect(controller.table.log[0]).toBe(
      "Table ready. Bots are taking their seats."
    );
    // La lingua non tocca i gettoni: stack iniziali standard.
    const total = controller.table.players.reduce((sum, p) => sum + p.chips, 0);
    expect(total).toBe(5000 * controller.table.players.length);
  });

  it("un GameController creato in FR ha il badge d'attesa dei bot in francese", () => {
    setLocale("fr");
    const controller = new GameController(false, "hilow");
    const bot = controller.table.players.find(player => player.isBot)!;
    expect(bot.lastAction).toBe("En attente");
    expect(controller.table.players[0].lastAction).toBe("Prêt");
  });
});
