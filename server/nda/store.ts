/**
 * Store delle firme NDA: anti-replay + idempotenza (PR3, tracking #30 punto 1).
 *
 * Due invarianti:
 *  1. **Anti-replay** «una demo per email»: la stessa email aziendale non ottiene
 *     un secondo signature/timer con una richiesta NUOVA (chiave d'idempotenza
 *     diversa) → il chiamante mappa a 409.
 *  2. **Idempotenza sulla risposta persa**: un retry con la STESSA
 *     `idempotencyKey` (generata e persistita dal client PRIMA dell'invio)
 *     recupera la sessione identica (signatureId + password + startedAt) invece
 *     di essere rifiutato — così una risposta HTTP persa non esclude l'utente.
 *
 * L'interfaccia è **async**: `createInMemorySignatureStore` è il default
 * (dev/CI, e produzione senza `DATABASE_URL`); `createPostgresSignatureStore`
 * (in `pgStore.ts`) è l'implementazione durevole dietro la stessa interfaccia.
 *
 * `reserve` è un check-and-set ATOMICO che classifica l'esito (reserved /
 * replay / duplicate_email) in un'unica operazione: nell'in-memory è atomico
 * perché non c'è `await` tra letture e scritture (event loop single-thread);
 * in Postgres è garantito dai vincoli PRIMARY KEY / UNIQUE.
 */
export type StoredSignature = {
  idempotencyKey: string;
  businessEmail: string;
  signatureId: string;
  password: string;
  startedAt: number; // epoch ms della firma (autorevole lato server)
  ndaVersion: string;
  // Esito email al momento della firma originale (per un replay fedele).
  serverAcknowledged: boolean;
  companyCopyRequested: boolean;
};

/** Esito di `reserve`, che unisce controllo idempotenza + anti-replay. */
export type ReserveOutcome =
  | { status: "reserved" }
  // Stessa `idempotencyKey` già registrata → replay della sessione esistente.
  | { status: "replay"; record: StoredSignature }
  // Email già firmata con una chiave DIVERSA → 409 «una demo per email».
  | { status: "duplicate_email" };

export interface SignatureStore {
  /** Recupera la firma per `idempotencyKey` (per il replay), se presente. */
  getByIdempotencyKey(
    idempotencyKey: string
  ): Promise<StoredSignature | undefined>;
  /**
   * Prenota la firma in modo ATOMICO classificando l'esito. Non lancia: il
   * chiamante mappa `duplicate_email`→409 e `replay`→200 con la sessione esistente.
   */
  reserve(entry: StoredSignature): Promise<ReserveOutcome>;
  /**
   * Aggiorna l'esito email di una prenotazione già registrata (dopo l'invio),
   * così un futuro replay riflette `serverAcknowledged`/`companyCopyRequested`
   * reali. No-op se la chiave non esiste (es. già rilasciata).
   */
  finalize(
    idempotencyKey: string,
    patch: { serverAcknowledged: boolean; companyCopyRequested: boolean }
  ): Promise<void>;
  /**
   * Rilascia la prenotazione (rollback) SOLO se `signatureId` corrisponde
   * (evita che un rollback cancelli la prenotazione di un'altra richiesta). Serve
   * quando la firma non produce un artefatto durevole (email non inviata): così
   * l'utente può ritentare invece di restare bloccato.
   */
  release(businessEmail: string, signatureId: string): Promise<void>;
}

/** Normalizza l'email per il confronto (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Implementazione in-memory (per-processo, effimera). */
export function createInMemorySignatureStore(): SignatureStore {
  const byKey = new Map<string, StoredSignature>();
  const keyByEmail = new Map<string, string>();
  return {
    async getByIdempotencyKey(idempotencyKey) {
      return byKey.get(idempotencyKey);
    },
    async reserve(entry) {
      // Check-and-set sincrono (nessun await tra letture e scritture): atomico
      // rispetto ad altre richieste concorrenti.
      const existing = byKey.get(entry.idempotencyKey);
      if (existing) return { status: "replay", record: existing };
      const emailKey = normalizeEmail(entry.businessEmail);
      if (keyByEmail.has(emailKey)) return { status: "duplicate_email" };
      byKey.set(entry.idempotencyKey, { ...entry });
      keyByEmail.set(emailKey, entry.idempotencyKey);
      return { status: "reserved" };
    },
    async finalize(idempotencyKey, patch) {
      const rec = byKey.get(idempotencyKey);
      if (rec) {
        rec.serverAcknowledged = patch.serverAcknowledged;
        rec.companyCopyRequested = patch.companyCopyRequested;
      }
    },
    async release(businessEmail, signatureId) {
      const emailKey = normalizeEmail(businessEmail);
      const key = keyByEmail.get(emailKey);
      if (key === undefined) return;
      const rec = byKey.get(key);
      if (rec && rec.signatureId === signatureId) {
        byKey.delete(key);
        keyByEmail.delete(emailKey);
      }
    },
  };
}
