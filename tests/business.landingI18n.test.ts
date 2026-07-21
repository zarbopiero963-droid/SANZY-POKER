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
  detectBizLocale,
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

  it("il nome del proprietario è «Piero Zarbo», mai il refuso «Zambo» (footer/T&C/privacy, IT+EN)", () => {
    // Regressione del refuso segnalato dall'owner nel nome del proprietario.
    for (const key of [
      "footer.rights",
      "legal.terms.body",
      "legal.privacy.body",
    ] as const) {
      for (const locale of BIZ_LOCALES) {
        const value = tb(key, locale);
        expect(value, `${key}:${locale}`).not.toMatch(/Zambo/);
      }
    }
    expect(tb("footer.rights", "it")).toContain("Piero Zarbo");
    expect(tb("legal.terms.body", "en")).toContain("Piero Zarbo");
    expect(tb("legal.privacy.body", "it")).toContain("Piero Zarbo");
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

describe("detectBizLocale — auto-riconoscimento lingua dal browser", () => {
  it("italiano preferito → it (accetta regione e maiuscole)", () => {
    expect(detectBizLocale(["it-IT", "en-US"])).toBe("it");
    expect(detectBizLocale(["it"])).toBe("it");
    expect(detectBizLocale("it-CH")).toBe("it");
    expect(detectBizLocale("  IT-it  ")).toBe("it"); // trim + case-insensitive
  });

  it("inglese preferito → en", () => {
    expect(detectBizLocale(["en-US"])).toBe("en");
    expect(detectBizLocale("en-GB")).toBe("en");
  });

  it("rispetta l'ORDINE di preferenza (prima lingua riconosciuta vince)", () => {
    // en prima di it → en; it prima di en → it
    expect(detectBizLocale(["en-US", "it-IT"])).toBe("en");
    expect(detectBizLocale(["it-IT", "en-US"])).toBe("it");
  });

  it("qualsiasi altra lingua nota (non IT) → en (target B2B estero)", () => {
    expect(detectBizLocale(["fr-FR"])).toBe("en");
    expect(detectBizLocale(["es"])).toBe("en");
    expect(detectBizLocale(["de-DE", "it-IT"])).toBe("en"); // de viene prima
  });

  it("nessuna informazione → default business (it)", () => {
    expect(detectBizLocale([])).toBe("it");
    expect(detectBizLocale(undefined)).toBe("it");
    expect(detectBizLocale(null)).toBe("it");
    expect(detectBizLocale("")).toBe("it");
  });

  it("il risultato è sempre una BizLocale valida", () => {
    for (const input of [["it"], ["en"], ["fr"], [], undefined, "xx"]) {
      expect(BIZ_LOCALES).toContain(detectBizLocale(input as string[]));
    }
  });
});
