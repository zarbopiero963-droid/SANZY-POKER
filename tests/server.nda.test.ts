/**
 * Test hard dell'endpoint NDA server (PR2, tracking #26).
 *
 * Esercitano il codice REALE del backend senza rete: validazione zod,
 * generazione server-authoritative, PDF, anti-replay atomico (+ rollback),
 * concorrenza, degradazione email, sanitizzazione PDF, allineamento versione.
 */
import { describe, it, expect } from "vitest";
import {
  ndaSignRequestSchema,
  generateSessionPassword,
  generateSignatureId,
  isSupportedNdaVersion,
  renderNdaPdf,
  renderSignedNdaText,
  sanitizedNdaParagraphs,
  toWinAnsiSafe,
  type SignedNdaRecord,
} from "../server/nda/signing";
import { NDA_VERSION } from "../server/nda/ndaText";
import {
  NDA_VERSION as SHARED_VERSION,
  ndaTemplate,
  fillNdaText,
} from "../shared/ndaText";
import { NDA_VERSION as CLIENT_VERSION } from "../client/src/business/demoSession";
import {
  createInMemorySignatureStore,
  normalizeEmail,
} from "../server/nda/store";
import { createRateLimiter } from "../server/nda/rateLimit";
import {
  processNdaSign,
  extractClientIp,
  maskEmail,
  createNdaRouter,
} from "../server/nda/router";
import express from "express";
import { createServer, type Server } from "http";
import type { AddressInfo } from "net";
import type { RateLimiter } from "../server/nda/rateLimit";
import {
  sendNdaEmail,
  buildEmailText,
  buildEmailSubject,
  stripControl,
  safeAttachmentId,
  withTimeout,
} from "../server/nda/email";

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

const emailSent = async () => ({ sent: true as const, id: "e1" });
const emailDegraded = async () => ({
  sent: false as const,
  reason: "no-api-key" as const,
});

function ctx(sendEmail: ProcessSendEmail) {
  return {
    store: createInMemorySignatureStore(),
    ip: "198.51.100.9",
    now: 1_800_000_000_000,
    newSignatureId: () => "snz_nda_fixedid00000000",
    newPassword: () => "SANZY-ABCD-EFGH",
    sendEmail,
  };
}
type ProcessSendEmail = Parameters<typeof processNdaSign>[1]["sendEmail"];

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

  it("rifiuta caratteri di controllo nei campi liberi (anti-injection)", () => {
    // Un \n iniettato forgerebbe righe di audit/paragrafi nel PDF/subject email.
    expect(
      ndaSignRequestSchema.safeParse({
        ...VALID_BODY,
        fullName: "Mario\nIP: 1.2.3.4",
      }).success
    ).toBe(false);
    expect(
      ndaSignRequestSchema.safeParse({
        ...VALID_BODY,
        companyName: "ACME\r\nBcc: x@y.com",
      }).success
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

describe("NDA — versione: fonte unica client↔shared↔server", () => {
  it("NDA_VERSION coincide ovunque (nessuna divergenza possibile)", () => {
    expect(NDA_VERSION).toBe(SHARED_VERSION);
    expect(CLIENT_VERSION).toBe(SHARED_VERSION);
  });
});

describe("NDA — testo e PDF", () => {
  it("renderSignedNdaText deriva dal template condiviso (stesse clausole)", () => {
    const text = renderSignedNdaText(RECORD);
    // Il titolo e le clausole canoniche del template condiviso sono presenti.
    expect(text).toContain(ndaTemplate("en").split("\n")[0]);
    expect(text).toContain("strictest confidentiality");
    // Segnaposto riempiti coi valori firmati (IP/timestamp/ID reali).
    expect(text).toContain("203.0.113.7");
    expect(text).toContain("2026-07-20T10:00:00.000Z");
    expect(text).toContain("snz_nda_deadbeef");
    expect(text).not.toMatch(
      /\{(NOME|AZIENDA|EMAIL|IP|TIMESTAMP|SIGNATURE_ID)\}/
    );
  });

  it("toWinAnsiSafe: Latin-1 OK; C1/CJK/emoji/newline → ?", () => {
    expect(toWinAnsiSafe("Café Zürich")).toBe("Café Zürich");
    expect(toWinAnsiSafe("株式会社")).toBe("????");
    expect(toWinAnsiSafe("emoji🎰x")).toBe("emoji?x");
    expect(toWinAnsiSafe("a\u0086b")).toBe("a?b"); // controllo C1 (non WinAnsi)
    // il newline è < 0x20 → sostituito: per questo `renderNdaPdf` fa lo split
    // sui paragrafi PRIMA di sanitizzare.
    expect(toWinAnsiSafe("a\nb")).toBe("a?b");
  });

  it("sanitizedNdaParagraphs preserva i paragrafi (newline NON distrutti)", () => {
    const paras = sanitizedNdaParagraphs(RECORD);
    expect(paras.length).toBeGreaterThan(15); // molte righe, non un unico blob
    // testo canonico ASCII + valori firmati: nessun "?" introdotto
    expect(paras.join("\n")).not.toContain("?");
    expect(paras).toContain(ndaTemplate("en").split("\n")[0]); // titolo = riga a sé
    expect(paras.join("\n")).toContain("203.0.113.7"); // IP firmato
  });

  it("fillNdaText: un valore che contiene un segnaposto NON viene ri-espanso", () => {
    // Regressione (integrità testo legale): con sostituzione sequenziale, un
    // valore utente come azienda="Foo {SIGNATURE_ID}" verrebbe ri-scansionato e
    // {SIGNATURE_ID} sostituito → testo canonico alterato dall'input utente.
    const filled = fillNdaText("en", {
      NOME: "Mario Rossi",
      AZIENDA: "Foo {SIGNATURE_ID}",
      EMAIL: "m@r.com",
      IP: "1.2.3.4",
      TIMESTAMP: "2026-07-20T10:00:00.000Z",
      SIGNATURE_ID: "snz_nda_REAL",
    });
    // Il {SIGNATURE_ID} iniettato nel nome azienda resta LETTERALE (non espanso).
    expect(filled).toContain("Foo {SIGNATURE_ID}");
    // Il vero segnaposto SIGNATURE_ID (nella clausola 4) è riempito col valore reale.
    expect(filled).toContain("snz_nda_REAL");
    // Nessun segnaposto canonico residuo non sostituito.
    expect(filled).not.toMatch(/\{(NOME|AZIENDA|EMAIL|IP|TIMESTAMP)\}/);
  });

  it("renderNdaPdf produce un PDF valido (header %PDF) e non vuoto", async () => {
    const pdf = await renderNdaPdf(RECORD);
    expect(pdf.byteLength).toBeGreaterThan(500);
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });

  it("renderNdaPdf NON lancia con nomi non-latini (sanitizzati)", async () => {
    const pdf = await renderNdaPdf({
      ...RECORD,
      fullName: "山田太郎",
      companyName: "株式会社テスト",
    });
    expect(new TextDecoder().decode(pdf.slice(0, 5))).toBe("%PDF-");
  });
});

describe("NDA — store anti-replay (async, atomico, rollback)", () => {
  it("normalizeEmail: trim + lowercase", () => {
    expect(normalizeEmail("  A@B.COM ")).toBe("a@b.com");
  });

  it("tryRecord registra e deduplica; release libera", async () => {
    const store = createInMemorySignatureStore();
    expect(await store.has("a@b.com")).toBe(false);
    expect(
      await store.tryRecord({
        signatureId: "s1",
        businessEmail: "A@B.com",
        startedAt: 1,
      })
    ).toBe(true);
    expect(await store.has("a@b.com")).toBe(true);
    expect((await store.get("a@b.com"))?.signatureId).toBe("s1");
    // duplicato → false (nessuna eccezione)
    expect(
      await store.tryRecord({
        signatureId: "s2",
        businessEmail: "a@b.com",
        startedAt: 2,
      })
    ).toBe(false);
    // release con signatureId SBAGLIATO non cancella; con quello giusto sì.
    await store.release("a@b.com", "wrong");
    expect(await store.has("a@b.com")).toBe(true);
    await store.release("a@b.com", "s1");
    expect(await store.has("a@b.com")).toBe(false);
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
    expect(await sendNdaEmail(emailInput, { apiKey: "" })).toEqual({
      sent: false,
      reason: "no-api-key",
    });
  });

  it("buildEmailText contiene i dati chiave della firma", () => {
    const text = buildEmailText(emailInput);
    expect(text).toContain("snz_nda_x");
    expect(text).toContain("john@acme.com");
    expect(text).toContain("1.2.3.4");
  });

  it("stripControl rimuove CR/LF/TAB, C0/DEL, C1 e separatori Unicode", () => {
    // Difesa anti header-injection: nessun \r \n \t, C0/DEL, C1 (0x80-0x9f) o
    // separatore di riga Unicode (U+2028/U+2029) può sopravvivere.
    expect(stripControl("ACME\r\nBcc: evil@x.com")).toBe("ACMEBcc: evil@x.com");
    expect(stripControl("a\tb\x00c\x1fd\x7fe")).toBe("abcde");
    expect(stripControl("x\x85y\x9fz")).toBe("xyz"); // C1: NEL, APC
    expect(stripControl("p\u2028q\u2029r")).toBe("pqr"); // LINE/PARAGRAPH SEP
    // I caratteri Latin-1 stampabili (accentate) NON vanno rimossi:
    expect(stripControl("José Peña")).toBe("José Peña");
    expect(stripControl("pulita")).toBe("pulita");
  });

  it("safeAttachmentId tiene solo [A-Za-z0-9_-] (Content-Disposition sicuro)", () => {
    expect(safeAttachmentId("snz_nda_abc-123")).toBe("snz_nda_abc-123");
    expect(safeAttachmentId('a/b\\c"d\r\ne')).toBe("abcde");
  });

  it("buildEmailSubject è a riga singola anche con input malevolo", () => {
    const subject = buildEmailSubject({
      ...emailInput,
      companyName: "ACME\r\nBcc: evil@x.com",
    });
    expect(subject).not.toMatch(/[\r\n]/);
    expect(subject).toContain("ACMEBcc: evil@x.com");
    expect(subject).toContain(emailInput.signatureId);
  });

  it("buildEmailText non contiene mai newline iniettate dai campi", () => {
    const text = buildEmailText({
      ...emailInput,
      fullName: "John\r\nX-Injected: 1",
    });
    // La riga del nome resta una sola: nessuna newline extra dal payload.
    const nameLines = text.split("\n").filter(l => l.startsWith("Nome:"));
    expect(nameLines).toHaveLength(1);
    expect(nameLines[0]).toBe("Nome: JohnX-Injected: 1");
  });

  it("withTimeout: risolve se la promise è veloce", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });

  it("withTimeout: rigetta se la promise supera il timeout", async () => {
    // Una send Resend appesa non deve tenere bloccata la prenotazione: allo
    // scadere il race rigetta e il chiamante rilascia la firma (503).
    const hung = new Promise<string>(() => {}); // non si risolve mai
    await expect(withTimeout(hung, 10)).rejects.toThrow(/timeout/);
  });

  it("safeAttachmentId neutralizza un signatureId ostile nel filename", () => {
    expect(safeAttachmentId('x"; evil')).toBe("xevil");
  });
});

describe("NDA — maskEmail (audit senza PII in chiaro)", () => {
  it("nasconde il local part", () => {
    expect(maskEmail("john.doe@softswiss.com")).toBe("j***@softswiss.com");
    expect(maskEmail("bad")).toBe("***");
  });

  it("local-part di 1 carattere non viene rivelato", () => {
    // `a@x.com` NON deve diventare `a***@x.com` (rivelerebbe l'unico carattere).
    expect(maskEmail("a@x.com")).toBe("***@x.com");
    expect(maskEmail("@nolocal.com")).toBe("***");
  });
});

describe("NDA — processNdaSign (orchestrazione server-authoritative)", () => {
  it("firma con email inviata → 200, credenziali server, anti-replay REGISTRATO", async () => {
    const c = ctx(emailSent);
    const res = await processNdaSign(VALID_BODY, c);
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.signatureId).toBe("snz_nda_fixedid00000000");
    expect(res.body.password).toBe("SANZY-ABCD-EFGH");
    expect(res.body.startedAt).toBe(1_800_000_000_000);
    expect(res.body.serverAcknowledged).toBe(true);
    // email inviata → prenotazione mantenuta (anti-replay attivo)
    expect(await c.store.has(VALID_BODY.businessEmail)).toBe(true);
  });

  it("email degradata (no-api-key) → 200 serverAcknowledged:false ma anti-replay MANTENUTO", async () => {
    const c = ctx(emailDegraded);
    const res = await processNdaSign(VALID_BODY, c);
    expect(res.status).toBe(200);
    expect(res.body.serverAcknowledged).toBe(false);
    // degrada l'EMAIL, non l'anti-replay: la prenotazione resta → «una demo per
    // email» tiene anche senza RESEND_API_KEY.
    expect(await c.store.has(VALID_BODY.businessEmail)).toBe(true);
    const res2 = await processNdaSign(VALID_BODY, c);
    expect(res2.status).toBe(409);
  });

  it("errore email TRANSITORIO → 503 (ritentabile) e prenotazione rilasciata", async () => {
    const c = ctx(async () => ({
      sent: false as const,
      reason: "error" as const,
      detail: "boom",
    }));
    const res = await processNdaSign(VALID_BODY, c);
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("email_unavailable");
    // rilasciata: l'utente può ritentare (niente firma «persa» dietro un 409)
    expect(await c.store.has(VALID_BODY.businessEmail)).toBe(false);
  });

  it("fail-closed (requireEmail): no-api-key → 503 e prenotazione rilasciata", async () => {
    const c = { ...ctx(emailDegraded), requireEmail: true };
    const res = await processNdaSign(VALID_BODY, c);
    expect(res.status).toBe(503);
    expect(res.body.error).toBe("email_unavailable");
    expect(await c.store.has(VALID_BODY.businessEmail)).toBe(false);
  });

  it("anti-replay: seconda firma stessa email (prima inviata) → 409", async () => {
    const c = ctx(emailSent);
    await processNdaSign(VALID_BODY, c);
    const res2 = await processNdaSign(VALID_BODY, c);
    expect(res2.status).toBe(409);
    expect(res2.body.error).toBe("already_signed");
  });

  it("concorrenza: due firme simultanee stessa email → una 200 e una 409", async () => {
    const store = createInMemorySignatureStore();
    const mk = () => ({
      store,
      ip: "1.1.1.1",
      now: 1_800_000_000_000,
      newSignatureId: generateSignatureId,
      newPassword: () => "SANZY-ABCD-EFGH",
      sendEmail: emailSent,
    });
    const [r1, r2] = await Promise.all([
      processNdaSign(VALID_BODY, mk()),
      processNdaSign(VALID_BODY, mk()),
    ]);
    expect([r1.status, r2.status].sort()).toEqual([200, 409]);
  });

  it("versione NDA non supportata → 422", async () => {
    const res = await processNdaSign(
      { ...VALID_BODY, ndaVersion: "vecchia" },
      ctx(emailSent)
    );
    expect(res.status).toBe(422);
    expect(res.body.error).toBe("unsupported_nda_version");
  });

  it("body non valido → 400", async () => {
    const res = await processNdaSign({ fullName: "x" }, ctx(emailSent));
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("invalid_request");
  });

  it("il client NON può imporre signatureId/password (ignorati dallo schema)", async () => {
    const res = await processNdaSign(
      {
        ...VALID_BODY,
        signatureId: "hacked",
        password: "hacked",
        startedAt: 0,
      },
      ctx(emailSent)
    );
    expect(res.status).toBe(200);
    expect(res.body.signatureId).toBe("snz_nda_fixedid00000000");
    expect(res.body.password).toBe("SANZY-ABCD-EFGH");
    expect(res.body.startedAt).toBe(1_800_000_000_000);
  });
});

describe("NDA — extractClientIp (non spoofabile)", () => {
  it("usa req.ip (calcolato da Express con trust proxy)", () => {
    const req = {
      ip: "203.0.113.5",
      headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.5" },
      socket: { remoteAddress: "10.0.0.2" },
    } as unknown as import("express").Request;
    expect(extractClientIp(req)).toBe("203.0.113.5");
  });

  it("fallback: ULTIMO elemento di XFF (aggiunto dal proxy, non prependibile)", () => {
    const req = {
      headers: { "x-forwarded-for": "1.2.3.4, 203.0.113.9" },
      socket: { remoteAddress: "10.0.0.2" },
    } as unknown as import("express").Request;
    expect(extractClientIp(req)).toBe("203.0.113.9");
  });

  it("fallback finale su remoteAddress", () => {
    const req = {
      headers: {},
      socket: { remoteAddress: "10.0.0.2" },
    } as unknown as import("express").Request;
    expect(extractClientIp(req)).toBe("10.0.0.2");
  });
});

describe("NDA — rate limiter (anti-abuso)", () => {
  it("ammette fino a `max` per chiave nella finestra, poi blocca", () => {
    const rl = createRateLimiter({ max: 2, windowMs: 1000 });
    expect(rl.check("ip1", 0)).toBe(true);
    expect(rl.check("ip1", 100)).toBe(true);
    expect(rl.check("ip1", 200)).toBe(false); // 3° nella finestra → bloccato
    // chiave diversa: indipendente
    expect(rl.check("ip2", 200)).toBe(true);
    // oltre la finestra: i vecchi scadono → riammesso
    expect(rl.check("ip1", 1300)).toBe(true);
  });

  it("sweep elimina le entry scadute (niente crescita illimitata della Map)", () => {
    const rl = createRateLimiter({ max: 2, windowMs: 1000 });
    rl.check("a", 0);
    rl.check("b", 0);
    rl.check("c", 0);
    expect(rl.size()).toBe(3);
    rl.sweep(2000); // oltre la finestra → tutte scadute
    expect(rl.size()).toBe(0);
  });
});

/**
 * Integrazione HTTP reale del router NDA (server http effimero su porta 0):
 * verifica la catena middleware — rate limit PRIMA del parse, error handler del
 * parser JSON con risposta coerente col contratto API — che non è testabile su
 * `processNdaSign` (puro). Nessun mock: si esercita `createNdaRouter` reale.
 */
describe("NDA — router HTTP (contratto API: JSON error handler, rate limit)", () => {
  async function withServer(
    rateLimiter: RateLimiter | undefined,
    fn: (base: string) => Promise<void>
  ) {
    const app = express();
    app.use(
      "/api/nda",
      createNdaRouter({ store: createInMemorySignatureStore(), rateLimiter })
    );
    const server: Server = createServer(app);
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address() as AddressInfo;
    try {
      await fn(`http://127.0.0.1:${port}`);
    } finally {
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }

  it("JSON malformato → 400 JSON {ok:false,error:invalid_request} (non HTML)", async () => {
    await withServer(undefined, async base => {
      const res = await fetch(`${base}/api/nda/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ questo non è json valido",
      });
      expect(res.status).toBe(400);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect(await res.json()).toEqual({
        ok: false,
        error: "invalid_request",
      });
    });
  });

  it("rate limit scatta PRIMA del parse: body malformato ma 429 (non 400)", async () => {
    // Limiter che rifiuta sempre: se il 429 arriva anche con JSON invalido,
    // il rate limit gira prima di `express.json` (non paga il parse).
    const denyAll: RateLimiter = {
      check: () => false,
      sweep: () => {},
      size: () => 0,
    };
    await withServer(denyAll, async base => {
      const res = await fetch(`${base}/api/nda/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{ malformato",
      });
      expect(res.status).toBe(429);
      expect(await res.json()).toEqual({ ok: false, error: "rate_limited" });
    });
  });
});
