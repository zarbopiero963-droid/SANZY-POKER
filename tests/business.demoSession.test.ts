/**
 * Test hard della logica pura della demo B2B con NDA (idea #12, tracking #26).
 *
 * Esercitano le funzioni reali di `demoSession.ts`: validazione del modulo,
 * generazione password, costruzione del payload firmato e — soprattutto — il
 * comportamento del timer di 15 minuti, incluso l'invariante richiesto
 * dall'owner: **al refresh il timer non riparte** (dipende solo da `startedAt`).
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  buildNdaPayload,
  clearDemoSession,
  computeRemainingMs,
  createDemoSession,
  DEMO_DURATION_MS,
  formatCountdown,
  NDA_VERSION,
  generateSessionPassword,
  isExpired,
  clearIdempotencyKey,
  idempotencyKeyFor,
  isNdaFormValid,
  isTimerAnnounceTick,
  isValidEmail,
  loadCookieConsent,
  loadDemoSession,
  saveCookieConsent,
  saveDemoSession,
  timerPhase,
  TIMER_URGENT_MS,
  TIMER_WARN_MS,
  validateNdaForm,
  type NdaForm,
} from "../client/src/business/demoSession";

const VALID_FORM: NdaForm = {
  fullName: "  Mario Rossi  ",
  businessEmail: "mario@softswiss.com",
  companyName: "Softswiss",
  jobTitle: "Product Manager",
  accepted: true,
};

describe("demoSession — validazione email", () => {
  it("accetta email plausibili e rifiuta quelle malformate", () => {
    expect(isValidEmail("a@b.co")).toBe(true);
    expect(isValidEmail("mario.rossi@pragmatic.io")).toBe(true);
    expect(isValidEmail("nope")).toBe(false);
    expect(isValidEmail("no@domain")).toBe(false);
    expect(isValidEmail("@x.com")).toBe(false);
    expect(isValidEmail("a b@x.com")).toBe(false);
    expect(isValidEmail("")).toBe(false);
  });
});

describe("demoSession — validazione del modulo NDA", () => {
  it("un modulo completo e spuntato è valido", () => {
    expect(validateNdaForm(VALID_FORM)).toEqual({});
    expect(isNdaFormValid(VALID_FORM)).toBe(true);
  });

  it("segnala tutti i campi mancanti e la checkbox non spuntata", () => {
    const errors = validateNdaForm({
      fullName: "",
      businessEmail: "",
      companyName: "",
      jobTitle: "",
      accepted: false,
    });
    expect(errors.fullName).toBe("required");
    expect(errors.businessEmail).toBe("required");
    expect(errors.companyName).toBe("required");
    expect(errors.jobTitle).toBe("required");
    expect(errors.accepted).toBe("required");
    expect(isNdaFormValid({ ...VALID_FORM, accepted: false })).toBe(false);
  });

  it("un modulo spuntato ma con un campo obbligatorio vuoto resta invalido", () => {
    // Caso difeso dalla guardia finale di sign(): checkbox ok ma dati mancanti
    // non devono mai produrre un payload NDA con campi vuoti.
    expect(isNdaFormValid({ ...VALID_FORM, fullName: "" })).toBe(false);
    expect(isNdaFormValid({ ...VALID_FORM, businessEmail: "storto" })).toBe(
      false
    );
    expect(isNdaFormValid({ ...VALID_FORM, companyName: "  " })).toBe(false);
  });

  it("distingue email vuota da email non valida", () => {
    expect(
      validateNdaForm({ ...VALID_FORM, businessEmail: "storto" }).businessEmail
    ).toBe("email");
    expect(
      validateNdaForm({ ...VALID_FORM, businessEmail: "   " }).businessEmail
    ).toBe("required");
  });
});

describe("demoSession — password di sessione", () => {
  it("ha il formato SANZY-XXXX-XXXX senza caratteri ambigui", () => {
    for (let i = 0; i < 200; i++) {
      const pw = generateSessionPassword();
      expect(pw).toMatch(
        /^SANZY-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/
      );
      // niente caratteri ambigui 0/O/1/I/L
      expect(pw.slice(6)).not.toMatch(/[01OIL]/);
    }
  });

  it("genera valori diversi (nessuna collisione su un campione ampio)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 500; i++) seen.add(generateSessionPassword());
    expect(seen.size).toBe(500);
  });
});

describe("demoSession — payload e sessione firmata", () => {
  it("il payload rifila i campi e porta signatureId + acceptedAt + versione/locale NDA", () => {
    const payload = buildNdaPayload(VALID_FORM, {
      signatureId: "sig_123",
      acceptedAt: "2026-07-20T10:00:00.000Z",
      ndaLocale: "en",
    });
    expect(payload.fullName).toBe("Mario Rossi"); // trim
    expect(payload.businessEmail).toBe("mario@softswiss.com");
    expect(payload.companyName).toBe("Softswiss");
    expect(payload.jobTitle).toBe("Product Manager");
    expect(payload.signatureId).toBe("sig_123");
    expect(payload.acceptedAt).toBe("2026-07-20T10:00:00.000Z");
    // Auditabilità del click-wrap: registra QUALE testo (versione) e in che lingua.
    expect(payload.ndaVersion).toBe(NDA_VERSION);
    expect(payload.ndaLocale).toBe("en");
  });

  it("createDemoSession fissa startedAt = now e produce firma/password/payload", () => {
    const now = 1_800_000_000_000;
    const session = createDemoSession(VALID_FORM, now, "it");
    expect(session.startedAt).toBe(now);
    expect(session.signatureId.length).toBeGreaterThan(0);
    expect(session.password).toMatch(/^SANZY-/);
    expect(session.payload.signatureId).toBe(session.signatureId);
    expect(session.payload.acceptedAt).toBe(new Date(now).toISOString());
    expect(session.payload.companyName).toBe("Softswiss");
    expect(session.payload.ndaVersion).toBe(NDA_VERSION);
    expect(session.payload.ndaLocale).toBe("it");
  });

  it("due sessioni hanno firme diverse", () => {
    const a = createDemoSession(VALID_FORM, 1, "it");
    const b = createDemoSession(VALID_FORM, 1, "it");
    expect(a.signatureId).not.toBe(b.signatureId);
  });
});

describe("demoSession — timer 15 minuti", () => {
  const T0 = 1_800_000_000_000;

  it("parte pieno a 15:00 e scende col tempo", () => {
    expect(computeRemainingMs(T0, T0)).toBe(DEMO_DURATION_MS);
    expect(computeRemainingMs(T0, T0 + 5 * 60_000)).toBe(10 * 60_000);
    expect(formatCountdown(computeRemainingMs(T0, T0))).toBe("15:00");
    expect(formatCountdown(computeRemainingMs(T0, T0 + 5 * 60_000))).toBe(
      "10:00"
    );
  });

  it("NON riparte al refresh: dipende solo da startedAt, non da quante volte lo si legge", () => {
    // Firma a T0. Dopo 5 minuti la pagina viene "ricaricata": ricalcolando con
    // lo STESSO startedAt il tempo residuo resta 10:00, non torna a 15:00.
    const afterRefresh = computeRemainingMs(T0, T0 + 5 * 60_000);
    const afterAnotherRefresh = computeRemainingMs(T0, T0 + 5 * 60_000);
    expect(afterRefresh).toBe(10 * 60_000);
    expect(afterAnotherRefresh).toBe(10 * 60_000);
    // e più tardi scende ancora, non si resetta
    expect(computeRemainingMs(T0, T0 + 12 * 60_000)).toBe(3 * 60_000);
  });

  it("non supera mai la durata totale se l'orologio arretra dopo la firma", () => {
    // now < startedAt (clock spostato indietro): il residuo resta clampato a 15:00.
    expect(computeRemainingMs(T0, T0 - 60_000)).toBe(DEMO_DURATION_MS);
    expect(computeRemainingMs(T0, T0 - 60 * 60_000)).toBe(DEMO_DURATION_MS);
    expect(formatCountdown(computeRemainingMs(T0, T0 - 60_000))).toBe("15:00");
  });

  it("si ferma a zero (mai negativo) e risulta scaduto oltre i 15 minuti", () => {
    expect(computeRemainingMs(T0, T0 + 20 * 60_000)).toBe(0);
    expect(isExpired(T0, T0 + 15 * 60_000)).toBe(true);
    expect(isExpired(T0, T0 + 15 * 60_000 - 1)).toBe(false);
    expect(isExpired(T0, T0)).toBe(false);
    expect(formatCountdown(computeRemainingMs(T0, T0 + 20 * 60_000))).toBe(
      "00:00"
    );
  });

  it("formatCountdown arrotonda i secondi per eccesso", () => {
    expect(formatCountdown(1_500)).toBe("00:02");
    expect(formatCountdown(59_000)).toBe("00:59");
    expect(formatCountdown(60_000)).toBe("01:00");
    expect(formatCountdown(0)).toBe("00:00");
    expect(formatCountdown(-100)).toBe("00:00");
  });
});

describe("demoSession — fasi colore del timer (idea #12)", () => {
  it("calma sopra i 5 minuti, ambra fino a 1 minuto, rosso nell'ultimo minuto", () => {
    expect(timerPhase(10 * 60_000)).toBe("calm");
    expect(timerPhase(TIMER_WARN_MS + 1)).toBe("calm"); // 5:00 + 1ms
    expect(timerPhase(TIMER_WARN_MS)).toBe("warn"); // esattamente 5:00
    expect(timerPhase(3 * 60_000)).toBe("warn");
    expect(timerPhase(TIMER_URGENT_MS + 1)).toBe("warn"); // 1:00 + 1ms
    expect(timerPhase(TIMER_URGENT_MS)).toBe("urgent"); // esattamente 1:00
    expect(timerPhase(0)).toBe("urgent");
  });

  it("annuncia allo screen reader solo a soglie, non ogni secondo", () => {
    // Soglie annunciate (secondi residui): 5', 60/30/15/10/5/3/2/1/0.
    expect(isTimerAnnounceTick(60_000)).toBe(true); // 60s
    expect(isTimerAnnounceTick(30_000)).toBe(true); // 30s
    expect(isTimerAnnounceTick(10_000)).toBe(true); // 10s
    expect(isTimerAnnounceTick(5 * 60_000)).toBe(true); // 5:00
    expect(isTimerAnnounceTick(0)).toBe(true); // scaduto
    // Secondi non-soglia: nessun annuncio (niente spam nell'ultimo minuto).
    expect(isTimerAnnounceTick(59_000)).toBe(false);
    expect(isTimerAnnounceTick(45_000)).toBe(false);
    expect(isTimerAnnounceTick(9_000)).toBe(false);
    expect(isTimerAnnounceTick(4_000)).toBe(false);
  });
});

// Stub minimale di Web Storage: l'ambiente di test è "node" (niente
// localStorage), ma vogliamo esercitare le funzioni REALI di persistenza.
class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const STORAGE_KEY = "sanzy.demo.session";

describe("demoSession — persistenza minimale (no PII)", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage =
      new MemoryStorage() as unknown as Storage;
  });

  it("salva SOLO signatureId/password/startedAt, mai la PII del payload", () => {
    const session = createDemoSession(VALID_FORM, 1_800_000_000_000, "it");
    saveDemoSession(session);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw).toEqual({
      signatureId: session.signatureId,
      password: session.password,
      startedAt: session.startedAt,
    });
    // Nessun campo PII del payload deve finire nello storage.
    for (const pii of [
      "fullName",
      "businessEmail",
      "companyName",
      "jobTitle",
    ]) {
      expect(raw).not.toHaveProperty(pii);
    }
  });

  it("idempotencyKeyFor: stessa email → stessa chiave (persistita); clear la rigenera", () => {
    const k1 = idempotencyKeyFor("John@Acme.com");
    expect(k1).toMatch(/^[A-Za-z0-9_-]{8,64}$/);
    // stessa email (case-insensitive) → stessa chiave persistita
    expect(idempotencyKeyFor("john@acme.com")).toBe(k1);
    // email diversa → chiave diversa (firma diversa)
    const k2 = idempotencyKeyFor("mary@other.com");
    expect(k2).not.toBe(k1);
    // dopo clear si rigenera
    clearIdempotencyKey();
    const k3 = idempotencyKeyFor("mary@other.com");
    expect(k3).not.toBe(k2);
  });

  it("NON persiste companyCopyRequested (flag in-memory, non nello storage)", () => {
    const session = {
      ...createDemoSession(VALID_FORM, 1_800_000_000_000, "it"),
      companyCopyRequested: true,
    };
    saveDemoSession(session);
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw).not.toHaveProperty("companyCopyRequested");
    expect(Object.keys(raw).sort()).toEqual([
      "password",
      "signatureId",
      "startedAt",
    ]);
  });

  it("round-trip: loadDemoSession rilegge esattamente ciò che è stato salvato", () => {
    // startedAt nel passato: il guard rifiuta i timestamp futuri manomessi.
    const session = createDemoSession(VALID_FORM, Date.now() - 60_000, "it");
    saveDemoSession(session);
    expect(loadDemoSession()).toEqual({
      signatureId: session.signatureId,
      password: session.password,
      startedAt: session.startedAt,
    });
  });

  it("rifiuta blob malformati o con campi di tipo errato", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(loadDemoSession()).toBeNull();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ signatureId: "s", password: "p", startedAt: "NaN" })
    );
    expect(loadDemoSession()).toBeNull();
    localStorage.setItem(STORAGE_KEY, "non-json");
    expect(loadDemoSession()).toBeNull();
  });

  it("rifiuta stringhe vuote e startedAt nel futuro (dato manomesso)", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ signatureId: "", password: "p", startedAt: 1 })
    );
    expect(loadDemoSession()).toBeNull();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ signatureId: "s", password: "", startedAt: 1 })
    );
    expect(loadDemoSession()).toBeNull();
    // startedAt un'ora nel futuro: manomissione che allungherebbe la demo.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        signatureId: "s",
        password: "p",
        startedAt: Date.now() + 60 * 60 * 1000,
      })
    );
    expect(loadDemoSession()).toBeNull();
  });

  it("iniettando now, rifiuta anche un startedAt di pochi minuti nel futuro (niente tolleranza)", () => {
    // now iniettabile → funzione pura, e nessuna vecchia tolleranza di clock
    // skew: un startedAt anche solo 3 minuti oltre `now` viene scartato.
    const now = 1_800_000_000_000;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        signatureId: "s",
        password: "p",
        startedAt: now + 3 * 60 * 1000,
      })
    );
    expect(loadDemoSession(now)).toBeNull();
    // Esattamente `now` (bordo) è invece accettato.
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ signatureId: "s", password: "p", startedAt: now })
    );
    expect(loadDemoSession(now)).toEqual({
      signatureId: "s",
      password: "p",
      startedAt: now,
    });
  });

  it("clearDemoSession rimuove la sessione salvata", () => {
    saveDemoSession(createDemoSession(VALID_FORM, 1, "it"));
    clearDemoSession();
    expect(loadDemoSession()).toBeNull();
  });
});

describe("demoSession — consenso cookie (GDPR)", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: Storage }).localStorage =
      new MemoryStorage() as unknown as Storage;
  });

  it("null finché l'utente non sceglie, poi persiste accetta/rifiuta", () => {
    expect(loadCookieConsent()).toBeNull(); // banner ancora da mostrare
    saveCookieConsent(true);
    expect(loadCookieConsent()).toBe(true);
    saveCookieConsent(false);
    expect(loadCookieConsent()).toBe(false);
  });

  it("un valore non riconosciuto è trattato come 'non deciso' (null)", () => {
    localStorage.setItem("sanzy.cookies.accepted", "maybe");
    expect(loadCookieConsent()).toBeNull();
  });
});
