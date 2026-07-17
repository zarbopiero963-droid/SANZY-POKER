/**
 * Regolamento §5 (Standard) e regolamento Hi/Low — spareggi a parità di categoria.
 *
 * Standard: le parità DIVIDONO. Niente seme, niente carta più alta:
 *  - tutte le scale colore (minima/media/massima) hanno lo stesso valore;
 *  - fra due colori non contano né seme né carte;
 *  - fra full uguali (stesso tris) non conta la coppia;
 *  - fra scale dello stesso livello si divide;
 *  - il kicker non esiste: coppie/doppie coppie uguali dividono.
 *
 * Hi/Low: le parità si spareggiano con valore e poi seme (cuori > quadri > fiori > picche).
 */
import { describe, expect, it } from "vitest";
import {
  compareHands,
  evaluateHand,
  type CardCode,
} from "../client/src/game/rules";

const cmp = (a: CardCode[], b: CardCode[], variant: "standard" | "hilow") =>
  compareHands(evaluateHand(a), evaluateHand(b), variant);

describe("variante Standard — le parità dividono", () => {
  it("scala reale massima, media e minima di colore hanno lo stesso valore (esempio del regolamento)", () => {
    const massimaCuori = ["AH", "KH", "QH", "JH", "10H"];
    const mediaPicche = ["QS", "JS", "10S", "9S", "8S"];
    const minimaFiori = ["10C", "9C", "8C", "7C", "AC"];
    expect(cmp(massimaCuori, mediaPicche, "standard")).toBe(0);
    expect(cmp(mediaPicche, minimaFiori, "standard")).toBe(0);
    expect(cmp(massimaCuori, minimaFiori, "standard")).toBe(0);
  });

  it("colore contro colore: KQ87A di picche contro 98AKJ di cuori è parità (esempio del regolamento)", () => {
    const picche = ["KS", "QS", "8S", "7S", "AS"];
    const cuori = ["9H", "8H", "AH", "KH", "JH"];
    expect(cmp(picche, cuori, "standard")).toBe(0);
  });

  it("colore contro colore: nemmeno la carta più alta conta (A-alto vs 9-alto dividono)", () => {
    const alto = ["AH", "KH", "QH", "9H", "8H"];
    const basso = ["KD", "10D", "9D", "8D", "7D"];
    expect(cmp(alto, basso, "standard")).toBe(0);
  });

  it("full AAAJJ batte full KKKQQ (conta il tris)", () => {
    expect(
      cmp(
        ["AH", "AD", "AC", "JH", "JD"],
        ["KH", "KD", "KC", "QH", "QD"],
        "standard"
      )
    ).toBeGreaterThan(0);
  });

  it("full con lo stesso tris: la coppia non conta, si divide", () => {
    const fullQQ = ["KH", "KD", "KC", "QH", "QD"];
    const fullJJ = ["KH", "KD", "KC", "JH", "JD"];
    expect(cmp(fullQQ, fullJJ, "standard")).toBe(0);
  });

  it("scala massima batte scala media, che batte scala minima", () => {
    const massima = ["AH", "KS", "QD", "JC", "10H"];
    const media = ["KH", "QS", "JD", "10C", "9H"];
    const minima = ["10D", "9S", "8H", "7C", "AD"];
    expect(cmp(massima, media, "standard")).toBeGreaterThan(0);
    expect(cmp(media, minima, "standard")).toBeGreaterThan(0);
    expect(cmp(massima, minima, "standard")).toBeGreaterThan(0);
  });

  it("due scale medie di altezza diversa dividono (K-Q-J-10-9 contro Q-J-10-9-8)", () => {
    const mediaK = ["KH", "QS", "JD", "10C", "9H"];
    const mediaQ = ["QD", "JC", "10S", "9D", "8H"];
    expect(cmp(mediaK, mediaQ, "standard")).toBe(0);
  });

  it("tris di assi batte tris di K; tris uguali dividono", () => {
    expect(
      cmp(
        ["AH", "AD", "AC", "9S", "8C"],
        ["KH", "KD", "KC", "QS", "JC"],
        "standard"
      )
    ).toBeGreaterThan(0);
    // Stesso tris (condiviso dal tavolo), kicker diversi: parità.
    expect(
      cmp(
        ["KH", "KD", "KC", "QS", "JC"],
        ["KH", "KD", "KC", "10S", "9C"],
        "standard"
      )
    ).toBe(0);
  });

  it("doppie coppie: conta la coppia più alta, poi la seconda; uguali dividono senza kicker", () => {
    expect(
      cmp(
        ["AH", "AD", "KS", "KC", "7H"],
        ["QH", "QD", "JS", "JC", "AS"],
        "standard"
      )
    ).toBeGreaterThan(0);
    expect(
      cmp(
        ["AH", "AD", "KS", "KC", "7H"],
        ["AS", "AC", "QS", "QC", "KH"],
        "standard"
      )
    ).toBeGreaterThan(0);
    expect(
      cmp(
        ["AH", "AD", "KS", "KC", "QH"],
        ["AS", "AC", "KD", "KH", "7C"],
        "standard"
      )
    ).toBe(0);
  });

  it("coppie: conta il valore della coppia; coppie uguali dividono senza kicker", () => {
    expect(
      cmp(
        ["AH", "AD", "9S", "8C", "7H"],
        ["KH", "KD", "QS", "JC", "10H"],
        "standard"
      )
    ).toBeGreaterThan(0);
    expect(
      cmp(
        ["AH", "AD", "KS", "QC", "JH"],
        ["AS", "AC", "9D", "8H", "7C"],
        "standard"
      )
    ).toBe(0);
  });

  it("poker: conta il valore; poker uguale (dal tavolo) divide", () => {
    expect(
      cmp(
        ["AH", "AD", "AC", "AS", "7H"],
        ["KH", "KD", "KC", "KS", "QH"],
        "standard"
      )
    ).toBeGreaterThan(0);
    expect(
      cmp(
        ["AH", "AD", "AC", "AS", "KH"],
        ["AH", "AD", "AC", "AS", "7D"],
        "standard"
      )
    ).toBe(0);
  });

  it("carta alta non è una combinazione: qualsiasi carta alta divide con qualsiasi altra", () => {
    const forte = ["AH", "KS", "QD", "JC", "9H"];
    const debole = ["QC", "10S", "9D", "8C", "7H"];
    expect(cmp(forte, debole, "standard")).toBe(0);
  });
});

describe("variante Hi/Low — spareggi con valore e seme (cuori > quadri > fiori > picche)", () => {
  it("scala colore: vince quella di valore maggiore (massima > media > minima)", () => {
    const massimaPicche = ["AS", "KS", "QS", "JS", "10S"];
    const mediaCuori = ["KH", "QH", "JH", "10H", "9H"];
    const minimaCuori = ["10H", "9H", "8H", "7H", "AH"];
    expect(cmp(massimaPicche, mediaCuori, "hilow")).toBeGreaterThan(0);
    expect(cmp(mediaCuori, minimaCuori, "hilow")).toBeGreaterThan(0);
  });

  it("scala colore media: il valore delle carte viene PRIMA del seme (K-alta di picche batte Q-alta di cuori)", () => {
    const mediaKPicche = ["KS", "QS", "JS", "10S", "9S"];
    const mediaQCuori = ["QH", "JH", "10H", "9H", "8H"];
    expect(cmp(mediaKPicche, mediaQCuori, "hilow")).toBeGreaterThan(0);
  });

  it("scale colore identiche nel valore: decide il seme (cuori > quadri > fiori > picche)", () => {
    const suits = ["H", "D", "C", "S"];
    for (let strong = 0; strong < suits.length; strong += 1) {
      for (let weak = strong + 1; weak < suits.length; weak += 1) {
        const a = ["A", "K", "Q", "J", "10"].map(
          rank => `${rank}${suits[strong]}`
        );
        const b = ["A", "K", "Q", "J", "10"].map(
          rank => `${rank}${suits[weak]}`
        );
        expect(
          cmp(a, b, "hilow"),
          `${suits[strong]} deve battere ${suits[weak]}`
        ).toBeGreaterThan(0);
      }
    }
  });

  it("colore: decide il seme — 98AKJ di cuori batte KQ87A di picche (esempio del regolamento)", () => {
    const cuori = ["9H", "8H", "AH", "KH", "JH"];
    const picche = ["KS", "QS", "8S", "7S", "AS"];
    expect(cmp(cuori, picche, "hilow")).toBeGreaterThan(0);
  });

  it("full: conta il tris (AAAJJ batte KKKQQ), a parità di tris decide il seme", () => {
    expect(
      cmp(
        ["AH", "AD", "AC", "JH", "JD"],
        ["KH", "KD", "KC", "QH", "QD"],
        "hilow"
      )
    ).toBeGreaterThan(0);
    // Stesso valore di tris: la mano che contiene cuori prevale su quella senza.
    const conCuori = ["KH", "KD", "KC", "QH", "QD"];
    const senzaCuori = ["KD", "KC", "KS", "JS", "JC"];
    expect(cmp(conCuori, senzaCuori, "hilow")).toBeGreaterThan(0);
  });

  it("scala semplice: livello, poi carta più alta, poi seme", () => {
    const massima = ["AH", "KS", "QD", "JC", "10H"];
    const mediaK = ["KH", "QS", "JD", "10C", "9H"];
    const mediaQ = ["QD", "JC", "10S", "9D", "8H"];
    expect(cmp(massima, mediaK, "hilow")).toBeGreaterThan(0);
    expect(cmp(mediaK, mediaQ, "hilow")).toBeGreaterThan(0);
    // Stessa scala: decide il seme migliore presente.
    const conCuori = ["KH", "QS", "JD", "10C", "9S"];
    const senzaCuori = ["KD", "QC", "JS", "10D", "9C"];
    expect(cmp(conCuori, senzaCuori, "hilow")).toBeGreaterThan(0);
  });

  it("tris di assi batte tris di K; a parità decide il seme", () => {
    expect(
      cmp(
        ["AH", "AD", "AC", "9S", "8C"],
        ["KH", "KD", "KC", "QS", "JC"],
        "hilow"
      )
    ).toBeGreaterThan(0);
    const conCuori = ["KH", "KD", "KC", "QH", "JC"];
    const senzaCuori = ["KD", "KC", "KS", "QS", "JS"];
    expect(cmp(conCuori, senzaCuori, "hilow")).toBeGreaterThan(0);
  });

  it("coppie e doppie coppie: valore, poi seme", () => {
    expect(
      cmp(
        ["AH", "AD", "9S", "8C", "7H"],
        ["KH", "KD", "QS", "JC", "10H"],
        "hilow"
      )
    ).toBeGreaterThan(0);
    const coppiaConCuori = ["AH", "AD", "KS", "QC", "9S"];
    const coppiaSenzaCuori = ["AS", "AC", "KD", "QD", "9C"];
    expect(cmp(coppiaConCuori, coppiaSenzaCuori, "hilow")).toBeGreaterThan(0);
  });

  it("carta alta resta una non-combinazione anche in Hi/Low: parità", () => {
    const forte = ["AH", "KS", "QD", "JC", "9H"];
    const debole = ["QC", "10S", "9D", "8C", "7H"];
    expect(cmp(forte, debole, "hilow")).toBe(0);
  });
});
