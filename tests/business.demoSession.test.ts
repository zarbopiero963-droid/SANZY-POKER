/**
 * Test hard della logica pura della demo B2B con NDA (idea #12, tracking #26).
 *
 * Esercitano le funzioni reali di `demoSession.ts`: validazione del modulo,
 * generazione password, costruzione del payload firmato e — soprattutto — il
 * comportamento del timer di 15 minuti, incluso l'invariante richiesto
 * dall'owner: **al refresh il timer non riparte** (dipende solo da `startedAt`).
 */
import { describe, expect, it } from "vitest";
import {
  buildNdaPayload,
  computeRemainingMs,
  createDemoSession,
  DEMO_DURATION_MS,
  formatCountdown,
  generateSessionPassword,
  isExpired,
  isNdaFormValid,
  isValidEmail,
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
  it("il payload rifila i campi e porta signatureId + acceptedAt", () => {
    const payload = buildNdaPayload(VALID_FORM, {
      signatureId: "sig_123",
      acceptedAt: "2026-07-20T10:00:00.000Z",
    });
    expect(payload.fullName).toBe("Mario Rossi"); // trim
    expect(payload.businessEmail).toBe("mario@softswiss.com");
    expect(payload.companyName).toBe("Softswiss");
    expect(payload.jobTitle).toBe("Product Manager");
    expect(payload.signatureId).toBe("sig_123");
    expect(payload.acceptedAt).toBe("2026-07-20T10:00:00.000Z");
  });

  it("createDemoSession fissa startedAt = now e produce firma/password/payload", () => {
    const now = 1_800_000_000_000;
    const session = createDemoSession(VALID_FORM, now);
    expect(session.startedAt).toBe(now);
    expect(session.signatureId.length).toBeGreaterThan(0);
    expect(session.password).toMatch(/^SANZY-/);
    expect(session.payload.signatureId).toBe(session.signatureId);
    expect(session.payload.acceptedAt).toBe(new Date(now).toISOString());
    expect(session.payload.companyName).toBe("Softswiss");
  });

  it("due sessioni hanno firme diverse", () => {
    const a = createDemoSession(VALID_FORM, 1);
    const b = createDemoSession(VALID_FORM, 1);
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
