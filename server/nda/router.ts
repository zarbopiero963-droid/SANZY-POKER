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
 * imporli. Anti-replay: una demo per email aziendale (store).
 */
import express, { type Request, type Router } from "express";
import { ndaSignRequestSchema, isSupportedNdaVersion } from "./signing";
import {
  generateSignatureId,
  generateSessionPassword,
  renderNdaPdf,
  type SignedNdaRecord,
} from "./signing";
import { NDA_VERSION } from "./ndaText";
import type { SignatureStore } from "./store";
import { sendNdaEmail, type EmailResult, type NdaEmailInput } from "./email";

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
};

/**
 * Elabora una richiesta di firma NDA. Ritorna status + body senza toccare
 * Express. Ordine: validazione → versione NDA → anti-replay → generazione
 * server → PDF → email (degrade) → registrazione → risposta.
 */
export async function processNdaSign(
  rawBody: unknown,
  deps: ProcessDeps
): Promise<ProcessResult> {
  const parsed = ndaSignRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      status: 400,
      body: {
        ok: false,
        error: "invalid_request",
        issues: parsed.error.issues,
      },
    };
  }
  const req = parsed.data;

  if (!isSupportedNdaVersion(req.ndaVersion)) {
    return {
      status: 422,
      body: { ok: false, error: "unsupported_nda_version" },
    };
  }

  // Anti-replay: una demo per email aziendale.
  if (deps.store.has(req.businessEmail)) {
    return { status: 409, body: { ok: false, error: "already_signed" } };
  }

  const signatureId = (deps.newSignatureId ?? generateSignatureId)();
  const password = (deps.newPassword ?? generateSessionPassword)();
  const acceptedAt = new Date(deps.now).toISOString();

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

  // Log server-side dell'IP/ora (audit); nessun segreto stampato.
  console.log(
    `[nda] firma ${signatureId} email=${req.businessEmail} ip=${deps.ip} at=${acceptedAt} emailSent=${email.sent}`
  );

  // Registra la firma solo dopo aver prodotto PDF (e tentato l'email): l'email
  // può fallire/degradare, ma la firma è comunque valida e va deduplicata.
  deps.store.record({
    signatureId,
    businessEmail: req.businessEmail,
    startedAt: deps.now,
  });

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
}

/** Rileva l'IP del client dietro il proxy Railway (X-Forwarded-For) con fallback. */
export function extractClientIp(req: Request): string {
  const xff = req.headers["x-forwarded-for"];
  if (typeof xff === "string" && xff.length > 0) {
    return xff.split(",")[0].trim();
  }
  if (Array.isArray(xff) && xff.length > 0) {
    return xff[0].split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

/** Crea il router Express che monta `POST /sign` (montato sotto `/api/nda`). */
export function createNdaRouter(deps: { store: SignatureStore }): Router {
  const router = express.Router();
  router.post("/sign", express.json({ limit: "16kb" }), async (req, res) => {
    try {
      const result = await processNdaSign(req.body, {
        store: deps.store,
        ip: extractClientIp(req),
        now: Date.now(),
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
