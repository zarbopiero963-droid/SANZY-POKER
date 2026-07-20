/**
 * Test hard dell'endpoint NDA server (PR2, tracking #26).
 *
 * Esercitano il codice REALE del backend senza rete: validazione zod,
 * generazione server-authoritative, PDF, anti-replay, degradazione email.
 */
import { describe, it, expect } from "vitest";
import {
  ndaSignRequestSchema,
  generateSessionPassword,
  generateSignatureId,
  isSupportedNdaVersion,
  renderNdaPdf,
  renderSignedNdaText,
  type SignedNdaRecord,
} from "../server/nda/signing";
import { NDA_VERSION, fillNdaText } from "../server/nda/ndaText";
import {
  createInMemorySignatureStore,
  normalizeEmail,
} from "../server/nda/store";
import { processNdaSign, extractClientIp } from "../server/nda/router";
import { sendNdaEmail, buildEmailText } from "../server/nda/email";

const VALID_BODY = {
  fullName: "John Doe",
  businessEmail: "john.doe@softswiss.com",
  companyName: "Softswiss",
  jobTitle: "Product Manager",
  accepted: true as const,
  ndaLocale: "en" as const,
  ndaVersion: NDA_VERSION,
};

const RECORD: SignedNdaRecord = {
  signatureId: "snz_nda_deadbeef",
  fullName: "John Doe",
  businessEmail: "john.doe@softswiss.com",
  companyName: "Softswiss",
  jobTitle: "Product Manager",
  ndaLocale: "en",
  ndaVersion: NDA_VERSION,
  ip: "203.0.113.7",
  acceptedAt: "2026-07-20T10:00:00.000Z",
};

describe("NDA — validazione richiesta (zod)", () => {
  it("accetta un corpo valido", () => {
    expect(ndaSignRequestSchema.safeParse(VALID_BODY).success).toBe(true);
  });

  it("rifiuta accepted !== true", () => {
    expect(
      ndaSignRequestSchema.safeParse({ ...VALID_BODY, accepted: false }).success
    ).toBe(false);
  });

  it("rifiuta email non valida e campi mancanti", () => {
    expect(
      ndaSignRequestSchema.safeParse({ ...VALID_BODY, businessEmail: "nope" })
        .success
    ).toBe(false);
    const { fullName, ...noName } = VALID_BODY;
    void fullName;
    expect(ndaSignRequestSchema.safeParse(noName).success).toBe(false);
  });

  it("rifiuta una locale fuori da it/en", () => {
    expect(
      ndaSignRequestSchema.safeParse({ ...VALID_BODY, ndaLocale: "es" }).success
    ).toBe(false);
  });
});

describe("NDA — generazione server-authoritative", () => {
  it("password nel formato SANZY-XXXX-XXXX senza caratteri ambigui", () => {
    for (let i = 0; i < 50; i++) {
      const pw = generateSessionPassword();
      expect(pw).toMatch(
        /^SANZY-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}$/
      );
      expect(pw).not.toMatch(/[01OIL]/);
    }
  });

  it("signatureId nel formato snz_nda_<hex> e univoco", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = generateSignatureId();
      expect(id).toMatch(/^snz_nda_[0-9a-f]{16}$/);
      ids.add(id);
    }
    expect(ids.size).toBe(100);
  });

  it("riconosce solo la versione NDA del server", () => {
    expect(isSupportedNdaVersion(NDA_VERSION)).toBe(true);
    expect(isSupportedNdaVersion("pr1-draft-1")).toBe(false);
  });
});

describe("NDA — testo e PDF", () => {
  it("fillNdaText riempie tutti i segnaposto senza lasciarne", () => {
    const text = fillNdaText("it", {
      NOME: "Mario Rossi",
      AZIENDA: "ACME",
      EMAIL: "m@acme.com",
      IP: "1.2.3.4",
      TIMESTAMP: "2026-07-20T10:00:00.000Z",
      SIGNATURE_ID: "snz_nda_abc",
    });
    expect(text).toContain("Mario Rossi");
    expect(text).toContain("1.2.3.4");
    expect(text).toContain("snz_nda_abc");
    expect(text).not.toMatch(
      /\{(NOME|AZIENDA|EMAIL|IP|TIMESTAMP|SIGNATURE_ID)\}/
    );
  });

  it("renderSignedNdaText inserisce IP e timestamp autorevoli", () => {
    const text = renderSignedNdaText(RECORD);
    expect(text).toContain("203.0.113.7");
    expect(text).toContain("2026-07-20T10:00:00.000Z");
    expect(text).toContain("snz_nda_deadbeef");
  });

  it("renderNdaPdf produce un PDF valido (header %PDF) e non vuoto", async () => {
    const pdf = await renderNdaPdf(RECORD);
    expect(pdf.byteLength).toBeGreaterThan(500);
    const header = new TextDecoder().decode(pdf.slice(0, 5));
    expect(header).toBe("%PDF-");
  });
});

describe("NDA — store anti-replay", () => {
  it("normalizeEmail: trim + lowercase", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
  });

  it("registra e deduplica per email; record duplicato lancia", () => {
    const store = createInMemorySignatureStore();
    expect(store.has("a@b.com")).toBe(false);
    store.record({ signatureId: "s1", businessEmail: "A@B.com", startedAt: 1 });
    expect(store.has("a@b.com")).toBe(true);
    expect(store.get("a@b.com")?.signatureId).toBe("s1");
    expect(() =>
      store.record({
        signatureId: "s2",
        businessEmail: "a@b.com",
        startedAt: 2,
      })
    ).toThrow();
  });
});

describe("NDA — email (degradazione senza chiave)", () => {
  const emailInput = {
    signatureId: "snz_nda_x",
    fullName: "John Doe",
    businessEmail: "john@acme.com",
    companyName: "ACME",
    jobTitle: "PM",
    ip: "1.2.3.4",
    acceptedAt: "2026-07-20T10:00:00.000Z",
    ndaVersion: NDA_VERSION,
    pdf: new Uint8Array([1, 2, 3]),
  };

  it("senza RESEND_API_KEY ritorna sent:false reason no-api-key (no throw)", async () => {
    const res = await sendNdaEmail(emailInput, { apiKey: "" });
    expect(res).toEqual({ sent: false, reason: "no-api-key" });
  });

  it("buildEmailText contiene i dati chiave della firma", () => {
    const text = buildEmailText(emailInput);
    expect(text).toContain("snz_nda_x");
    expect(text).toContain("john@acme.com");
    expect(text).toContain("1.2.3.4");
  });
});

describe("NDA — processNdaSign (orchestrazione server-authoritative)", () => {
  const ctxBase = () => ({
    store: createInMemorySignatureStore(),
    ip: "198.51.100.9",
    now: 1_800_000_000_000,
    newSignatureId: () => "snz_nda_fixedid00000000",
    newPassword: () => "SANZY-ABCD-EFGH",
    sendEmail: async () => ({
      sent: false as const,
      reason: "no-api-key" as const,
    }),
  });

  it("firma valida → 200 con credenziali del server e startedAt=now", async () => {
    const ctx = ctxBase();
    const res = await processNdaSign(VALID_BODY, ctx);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.signatureId).toBe("snz_nda_fixedid00000000");
    expect(res.body.password).toBe("SANZY-ABCD-EFGH");
    expect(res.body.startedAt).toBe(1_800_000_000_000);
    // email degradata → serverAcknowledged false, ma firma comunque registrata
    expect(res.body.serverAcknowledged).toBe(false);
    expect(ctx.store.has(VALID_BODY.businessEmail)).toBe(true);
  });

  it("serverAcknowledged true solo se l'email è stata inviata", async () => {
    const ctx = {
      ...ctxBase(),
      sendEmail: async () => ({ sent: true as const, id: "e1" }),
    };
    const res = await processNdaSign(VALID_BODY, ctx);
    expect(res.body.serverAcknowledged).toBe(true);
  });

  it("anti-replay: seconda firma stessa email → 409", async () => {
    const ctx = ctxBase();
    await processNdaSign(VALID_BODY, ctx);
    const res2 = await processNdaSign(VALID_BODY, ctx);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe("already_signed");
  });

  it("versione NDA non supportata → 422", async () => {
    const res = await processNdaSign(
      { ...VALID_BODY, ndaVersion: "vecchia" },
      ctxBase()
    );
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("unsupported_nda_version");
  });

  it("body non valido → 400 senza registrare nulla", async () => {
    const ctx = ctxBase();
    const res = await processNdaSign({ fullName: "x" }, ctx);
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("il client NON può imporre signatureId/password (ignorati dallo schema)", async () => {
    const ctx = ctxBase();
    const res = await processNdaSign(
      {
        ...VALID_BODY,
        signatureId: "hacked",
        password: "hacked",
        startedAt: 0,
      },
      ctx
    );
    expect(res.status).toBe(200);
    expect(res.body.signatureId).toBe("snz_nda_fixedid00000000");
    expect(res.body.password).toBe("SANZY-ABCD-EFGH");
    expect(res.body.startedAt).toBe(1_800_000_000_000);
  });
});

describe("NDA — extractClientIp", () => {
  it("prende il primo IP di X-Forwarded-For", () => {
    const req = {
      headers: { "x-forwarded-for": "203.0.113.1, 10.0.0.1" },
      socket: { remoteAddress: "10.0.0.2" },
    } as unknown as import("express").Request;
    expect(extractClientIp(req)).toBe("203.0.113.1");
  });

  it("fallback su remoteAddress se manca XFF", () => {
    const req = {
      headers: {},
      socket: { remoteAddress: "10.0.0.2" },
    } as unknown as import("express").Request;
    expect(extractClientIp(req)).toBe("10.0.0.2");
  });
});
