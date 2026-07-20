/**
 * Test hard dell'i18n della sezione business (IT/EN) — idea #12, tracking #26.
 *
 * Blinda l'invariante concordato: ogni chiave mostrata esiste in ENTRAMBE le
 * lingue con valore non vuoto, e `tb()` risolve e interpola correttamente. È
 * separato dall'i18n del gioco (4 lingue) apposta, per non incrociare i due
 * contratti.
 */
import { describe, expect, it } from "vitest";
import {
  BIZ_LOCALES,
  BIZ_STRINGS,
  bizKeys,
  tb,
} from "../client/src/business/landingI18n";

describe("landingI18n — completezza IT/EN", () => {
  it("definisce un insieme di chiavi non vuoto e senza duplicati", () => {
    const keys = bizKeys();
    expect(keys.length).toBeGreaterThan(20);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("ogni chiave ha sia IT sia EN, non vuote", () => {
    for (const key of bizKeys()) {
      for (const locale of BIZ_LOCALES) {
        const value = BIZ_STRINGS[key][locale];
        expect(value, `${key}:${locale}`).toBeTruthy();
        expect(typeof value).toBe("string");
      }
    }
  });

  it("copre esattamente le due lingue previste", () => {
    expect(BIZ_LOCALES).toEqual(["it", "en"]);
    for (const key of bizKeys()) {
      expect(Object.keys(BIZ_STRINGS[key]).sort()).toEqual(["en", "it"]);
    }
  });

  it("la privacy NON afferma più che i dati restano nel browser (backend attivo)", () => {
    // Regressione: con il backend PR2 i dati VENGONO inviati al server; la vecchia
    // nota «i dati non lasciano il browser» sarebbe materialmente falsa.
    const it = tb("legal.privacy.body", "it");
    const en = tb("legal.privacy.body", "en");
    expect(it).not.toMatch(/NON vengono inviati ad alcun server/i);
    expect(en).not.toMatch(/NOT sent to any server/i);
    // …e deve dichiarare l'invio al server e il destinatario email (Resend).
    expect(it).toMatch(/inviati al nostro server/i);
    expect(it).toMatch(/Resend/);
    expect(en).toMatch(/sent to our server/i);
    expect(en).toMatch(/Resend/);
  });
});

describe("landingI18n — risoluzione e interpolazione di tb()", () => {
  it("risolve chiavi reali nelle due lingue", () => {
    expect(tb("landing.tagline", "it")).toBe("Due piatti, una sola lettura");
    expect(tb("landing.tagline", "en")).toBe("Two pots, one read");
    expect(tb("unlock.launch", "it")).toBe("Avvia tavolo 3D");
    expect(tb("unlock.launch", "en")).toBe("Launch 3D table");
  });

  it("interpola i parametri {n}", () => {
    expect(tb("nda.step", "it", { n: 2 })).toBe("Passo 2 di 3");
    expect(tb("nda.step", "en", { n: 3 })).toBe("Step 3 of 3");
  });

  it("non interpreta i pattern di replace ($&, $1) nel valore del parametro", () => {
    // Regressione: con replace(regex, stringa) un valore contenente "$&" verrebbe
    // sostituito con la stringa matchata ("{n}"); con la forma a funzione resta
    // letterale. I params reali sono numeri, ma il fix blinda il caso futuro.
    expect(tb("nda.step", "it", { n: "$&X" })).toBe("Passo $&X di 3");
    expect(tb("nda.step", "it", { n: "$1" })).toBe("Passo $1 di 3");
  });

  it("ripiega sulla chiave se manca (comportamento visibile, mai in produzione)", () => {
    expect(tb("chiave.inesistente", "it")).toBe("chiave.inesistente");
  });

  it("usa l'italiano come lingua di default", () => {
    expect(tb("nda.submit")).toBe("Entra nel futuro");
  });
});
