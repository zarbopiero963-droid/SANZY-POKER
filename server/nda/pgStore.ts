/**
 * Implementazione DUREVOLE di `SignatureStore` su Postgres (PR3, #30 punto 1).
 *
 * Dietro la stessa interfaccia dell'in-memory: si attiva quando `DATABASE_URL`
 * è configurata (vedi `server/index.ts`); altrimenti si degrada all'in-memory,
 * come l'email senza `RESEND_API_KEY`. L'atomicità di `reserve` è garantita dai
 * vincoli PRIMARY KEY (`idempotency_key`) e UNIQUE (`business_email`): un unico
 * `INSERT ... ON CONFLICT DO NOTHING` decide reserved/replay/duplicate senza race.
 *
 * NB: la `password` è persistita perché è ciò che permette il replay della
 * sessione dopo una risposta persa (è un token di sessione a bassa sensibilità,
 * non una credenziale d'account). La verifica dell'email del firmatario è il
 * punto 3 di #30.
 */
import type { Pool } from "pg";
import {
  normalizeEmail,
  type ReserveOutcome,
  type SignatureStore,
  type StoredSignature,
} from "./store";

/**
 * Retention delle righe: la `password` di sessione è persistita per il replay,
 * ma non deve restare a tempo indefinito nel DB durevole. Le righe più vecchie
 * di questa finestra vengono cancellate opportunisticamente a ogni `reserve`
 * (nessun cron): bound sull'esposizione at-rest e anti-replay «una demo per
 * email» che diventa una finestra scorrevole (dopo la scadenza l'email può
 * rifirmare). La sessione server-authoritative (PR3 punto 2) affinerà il ciclo.
 */
const ROW_RETENTION_MS = 30 * 24 * 60 * 60 * 1000; // 30 giorni

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS nda_signatures (
    idempotency_key TEXT PRIMARY KEY,
    business_email TEXT NOT NULL UNIQUE,
    signature_id TEXT NOT NULL,
    password TEXT NOT NULL,
    started_at BIGINT NOT NULL,
    nda_version TEXT NOT NULL,
    server_acknowledged BOOLEAN NOT NULL DEFAULT false,
    company_copy_requested BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
`;

type Row = {
  idempotency_key: string;
  business_email: string;
  signature_id: string;
  password: string;
  started_at: string | number | bigint;
  nda_version: string;
  server_acknowledged: boolean;
  company_copy_requested: boolean;
};

function rowToRecord(r: Row): StoredSignature {
  return {
    idempotencyKey: r.idempotency_key,
    businessEmail: r.business_email,
    signatureId: r.signature_id,
    password: r.password,
    startedAt: Number(r.started_at), // BIGINT arriva come stringa da node-postgres
    ndaVersion: r.nda_version,
    serverAcknowledged: r.server_acknowledged,
    companyCopyRequested: r.company_copy_requested,
  };
}

async function selectByKey(
  pool: Pool,
  idempotencyKey: string
): Promise<StoredSignature | undefined> {
  const { rows } = await pool.query<Row>(
    "SELECT * FROM nda_signatures WHERE idempotency_key = $1",
    [idempotencyKey]
  );
  return rows[0] ? rowToRecord(rows[0]) : undefined;
}

/** Crea la tabella se non esiste (migrazione idempotente, da chiamare all'avvio). */
export async function ensureSchema(pool: Pool): Promise<void> {
  await pool.query(CREATE_TABLE);
}

export function createPostgresSignatureStore(pool: Pool): SignatureStore {
  return {
    getByIdempotencyKey(idempotencyKey) {
      return selectByKey(pool, idempotencyKey);
    },

    async reserve(entry): Promise<ReserveOutcome> {
      const email = normalizeEmail(entry.businessEmail);
      // Cleanup opportunistico delle righe scadute (retention): niente cron,
      // niente `password` at-rest oltre la finestra. Cutoff passato come
      // parametro (evita dipendere dall'aritmetica `interval` del motore SQL).
      await pool.query("DELETE FROM nda_signatures WHERE created_at < $1", [
        new Date(Date.now() - ROW_RETENTION_MS),
      ]);
      // INSERT atomico: `ON CONFLICT DO NOTHING` copre SIA la PK
      // (`idempotency_key`) SIA la UNIQUE (`business_email`). Se ha inserito →
      // reserved; altrimenti classifico il conflitto con una lettura per chiave.
      const ins = await pool.query(
        `INSERT INTO nda_signatures
           (idempotency_key, business_email, signature_id, password,
            started_at, nda_version, server_acknowledged, company_copy_requested)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT DO NOTHING
         RETURNING idempotency_key`,
        [
          entry.idempotencyKey,
          email,
          entry.signatureId,
          entry.password,
          entry.startedAt,
          entry.ndaVersion,
          entry.serverAcknowledged,
          entry.companyCopyRequested,
        ]
      );
      if ((ins.rowCount ?? 0) > 0) return { status: "reserved" };
      // Conflitto: replay SOLO se combaciano chiave E email normalizzata (una
      // collisione di chiave o il riuso con un'altra email non deve restituire
      // la sessione di un altro); altrimenti è un conflitto (409).
      const existing = await selectByKey(pool, entry.idempotencyKey);
      if (existing && existing.businessEmail === email) {
        return { status: "replay", record: existing };
      }
      return { status: "duplicate_email" };
    },

    async finalize(idempotencyKey, patch) {
      await pool.query(
        `UPDATE nda_signatures
           SET server_acknowledged = $2, company_copy_requested = $3
         WHERE idempotency_key = $1`,
        [idempotencyKey, patch.serverAcknowledged, patch.companyCopyRequested]
      );
    },

    async release(businessEmail, signatureId) {
      await pool.query(
        "DELETE FROM nda_signatures WHERE business_email = $1 AND signature_id = $2",
        [normalizeEmail(businessEmail), signatureId]
      );
    },
  };
}
