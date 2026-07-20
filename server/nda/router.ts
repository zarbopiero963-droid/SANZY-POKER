/**
 * Endpoint `POST /api/nda/sign` (PR2, tracking #26).
 *
 * Il cuore è `processNdaSign`: PURO da Express (riceve body grezzo + contesto
 * iniettabile: store, ip, now, generatori, invio email) e ritorna `{ status,
 * body }`. Così è testabile hard offline senza rete né supertest. Il router
 * Express è solo un adattatore sottile che rileva l'IP e delega.
 *
 * Server-authoritative: signatureId, password e acceptedAt/startedAt sono
 * generati/decisi dal server; l'IP è rilevato dal server. Il client NON può
 * imporli. Anti-replay: una demo per email aziendale, con prenotazione ATOMICA
 * (`tryRecord`) e rollback (`release`) se non si produce un artefatto durevole.
 */
import express, { type Request, type Router } from "express";
import {
  ndaSignRequestSchema,
  isSupportedNdaVersion,
  generateSignatureId,
  generateSessionPassword,
  renderNdaPdf,
  type SignedNdaRecord,
} from "./signing";
import { NDA_VERSION } from "./ndaText";
import type { SignatureStore } from "./store";
import { sendNdaEmail, type EmailResult, type NdaEmailInput } from "./email";
import { createRateLimiter, type RateLimiter } from "./rateLimit";

export type NdaSignResponse = {
  ok: boolean;
  signatureId?: string;
  password?: string;
  startedAt?: number;
  serverAcknowledged?: boolean;
  error?: string;
  issues?: unknown;
};

export type ProcessResult = { status: number; body: NdaSignResponse };

export type ProcessDeps = {
  store: SignatureStore;
  ip: string;
  now: number;
  newSignatureId?: () => string;
  newPassword?: () => string;
  sendEmail?: (input: NdaEmailInput) => Promise<EmailResult>;
  /** Fail-closed: se true, senza email consegnata NON si concede la demo (503).
   * Attivabile in produzione via `NDA_REQUIRE_EMAIL=1`. Default: degradato. */
  requireEmail?: boolean;
};

/**
 * Elabora una richiesta di firma NDA. Ritorna status + body senza toccare
 * Express. Ordine: validazione → versione NDA → prenotazione atomica (409 se
 * già firmata) → generazione → PDF → email → [rollback se non inviata] → 200.
 */
export async function processNdaSign(
  rawBody: unknown,
  deps: ProcessDeps
): Promise<ProcessResult> {
  const parsed = ndaSignRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    // Non esponiamo i dettagli interni di zod al client.
    return { status: 400, body: { ok: false, error: "invalid_request" } };
  }
  const req = parsed.data;

  if (!isSupportedNdaVersion(req.ndaVersion)) {
    return {
      status: 422,
      body: { ok: false, error: "unsupported_nda_version" },
    };
  }

  const signatureId = (deps.newSignatureId ?? generateSignatureId)();
  const password = (deps.newPassword ?? generateSessionPassword)();
  const acceptedAt = new Date(deps.now).toISOString();

  // Prenotazione ATOMICA prima di qualunque await: due richieste concorrenti con
  // la stessa email non possono passare entrambe (niente 500 spurio, niente
  // doppia email). La seconda ottiene 409.
  const reserved = await deps.store.tryRecord({
    signatureId,
    businessEmail: req.businessEmail,
    startedAt: deps.now,
  });
  if (!reserved) {
    return { status: 409, body: { ok: false, error: "already_signed" } };
  }

  try {
    const record: SignedNdaRecord = {
      signatureId,
      fullName: req.fullName,
      businessEmail: req.businessEmail,
      companyName: req.companyName,
      jobTitle: req.jobTitle,
      ndaLocale: req.ndaLocale,
      ndaVersion: req.ndaVersion,
      ip: deps.ip,
      acceptedAt,
    };

    const pdf = await renderNdaPdf(record);
    const email = await (deps.sendEmail ?? sendNdaEmail)({
      signatureId,
      fullName: req.fullName,
      businessEmail: req.businessEmail,
      companyName: req.companyName,
      jobTitle: req.jobTitle,
      ip: deps.ip,
      acceptedAt,
      ndaVersion: req.ndaVersion,
      pdf,
    });

    // Log server-side dell'audit (IP/ora); email MASCHERATA (no PII in chiaro).
    console.log(
      `[nda] firma ${signatureId} email=${maskEmail(req.businessEmail)} ip=${deps.ip} at=${acceptedAt} emailSent=${email.sent}`
    );

    if (!email.sent && (email.reason === "error" || deps.requireEmail)) {
      // Fail-closed: rollback della prenotazione e 503 quando NON c'è un
      // artefatto durevole (email non consegnata). Vale sempre per l'errore
      // TRANSITORIO del provider; e per `no-api-key` solo se `requireEmail`
      // (produzione strict) — così non si concede la demo senza registrazione.
      await deps.store.release(req.businessEmail, signatureId);
      if (email.reason === "error") {
        console.error(
          `[nda] email error ${signatureId}: ${email.detail ?? "?"}`
        );
      } else {
        // no-api-key + requireEmail: config strict senza Secret impostato →
        // diagnostica esplicita (altrimenti un 503 senza causa confonde l'owner).
        console.error(
          `[nda] email_unavailable ${signatureId}: NDA_REQUIRE_EMAIL attivo ma RESEND_API_KEY assente`
        );
      }
      return { status: 503, body: { ok: false, error: "email_unavailable" } };
    }
    // `no-api-key` senza `requireEmail` = modalità degradata DICHIARATA: si
    // degrada l'EMAIL, non l'anti-replay — la prenotazione resta (una demo per
    // email tiene comunque) e la demo è concessa con `serverAcknowledged:false`.

    return {
      status: 200,
      body: {
        ok: true,
        signatureId,
        password,
        startedAt: deps.now,
        serverAcknowledged: email.sent,
      },
    };
  } catch (err) {
    // Errore interno (es. rendering PDF): rollback della prenotazione e 500.
    await deps.store.release(req.businessEmail, signatureId);
    console.error("[nda] errore durante la firma:", err);
    return { status: 500, body: { ok: false, error: "internal_error" } };
  }
}

/** Maschera l'email per l'audit log (GDPR): `j***@dominio.com`. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "***";
  return `${email[0]}***${email.slice(at)}`;
}

/**
 * IP del client. Usa `req.ip` (calcolato da Express in base a `trust proxy`):
 * NON è spoofabile come il primo elemento di `X-Forwarded-For`. Fallback (test o
 * ambienti senza trust proxy): ULTIMO elemento di XFF — quello aggiunto dal
 * proxy più vicino, non prependibile dal client — poi il socket.
 */
export function extractClientIp(req: Request): string {
  if (typeof req.ip === "string" && req.ip.length > 0) return req.ip;
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff.join(",") : xff;
  if (typeof raw === "string" && raw.length > 0) {
    const parts = raw
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);
    if (parts.length > 0) return parts[parts.length - 1];
  }
  return req.socket?.remoteAddress ?? "unknown";
}

/** Crea il router Express che monta `POST /sign` (montato sotto `/api/nda`).
 * `rateLimiter` iniettabile (default: 8 firme per IP ogni 10 minuti). */
export function createNdaRouter(deps: {
  store: SignatureStore;
  rateLimiter?: RateLimiter;
}): Router {
  const limiter =
    deps.rateLimiter ?? createRateLimiter({ max: 8, windowMs: 10 * 60 * 1000 });
  // Fail-closed opt-in (produzione strict): senza email consegnata → 503.
  const requireEmail = /^(1|true)$/i.test(process.env.NDA_REQUIRE_EMAIL ?? "");
  const router = express.Router();
  router.post("/sign", express.json({ limit: "16kb" }), async (req, res) => {
    try {
      const ip = extractClientIp(req);
      if (!limiter.check(ip, Date.now())) {
        res.status(429).json({ ok: false, error: "rate_limited" });
        return;
      }
      const result = await processNdaSign(req.body, {
        store: deps.store,
        ip,
        now: Date.now(),
        requireEmail,
      });
      res.status(result.status).json(result.body);
    } catch (err) {
      console.error("[nda] errore interno:", err);
      res.status(500).json({ ok: false, error: "internal_error" });
    }
  });
  return router;
}

export { NDA_VERSION };
