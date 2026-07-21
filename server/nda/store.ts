/**
 * Store anti-replay delle firme NDA (PR2, tracking #26).
 *
 * Impedisce che la stessa email aziendale ottenga più demo (nuovo timer) a
 * ripetizione: "una demo per email". La chiave è l'email normalizzata.
 *
 * L'interfaccia è **async** di proposito: è il punto di estensione verso uno
 * store durevole (es. Postgres) senza dover cambiare la firma di
 * `processNdaSign`. `tryRecord` è un check-and-set ATOMICO: evita la race in cui
 * due richieste concorrenti con la stessa email passano entrambe un `has()`
 * separato dal `record()`.
 *
 * LIMITE DICHIARATO: l'implementazione è IN-MEMORY. Railway è un ambiente
 * effimero senza DB/volume persistente, quindi si azzera a ogni redeploy/restart
 * del processo. Accettabile per un gate di demo (deterrente, non sicurezza forte).
 */
export type StoredSignature = {
  signatureId: string;
  businessEmail: string;
  startedAt: number; // epoch ms della firma (autorevole lato server)
};

export interface SignatureStore {
  /** Firma già registrata per questa email? */
  has(businessEmail: string): Promise<boolean>;
  /** Recupera la firma esistente per l'email (se presente). */
  get(businessEmail: string): Promise<StoredSignature | undefined>;
  /**
   * Registra la firma in modo ATOMICO. Ritorna `true` se registrata, `false`
   * se l'email aveva già firmato (nessuna eccezione: il chiamante mappa a 409).
   */
  tryRecord(entry: StoredSignature): Promise<boolean>;
  /**
   * Rilascia la prenotazione per un'email (rollback) SOLO se corrisponde a
   * `signatureId` (evita che un rollback cancelli la prenotazione di un'altra
   * richiesta — rilevante con uno store condiviso/persistente futuro). Serve se
   * dopo il `tryRecord` la firma non produce un artefatto durevole (email non
   * inviata): così l'utente può ritentare invece di restare bloccato su 409.
   */
  release(businessEmail: string, signatureId: string): Promise<void>;
}

/** Normalizza l'email per il confronto (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Implementazione in-memory (per-processo). */
export function createInMemorySignatureStore(): SignatureStore {
  const byEmail = new Map<string, StoredSignature>();
  return {
    async has(businessEmail) {
      return byEmail.has(normalizeEmail(businessEmail));
    },
    async get(businessEmail) {
      return byEmail.get(normalizeEmail(businessEmail));
    },
    async tryRecord(entry) {
      // Check-and-set sincrono nel corpo (event loop single-thread di Node): non
      // c'è `await` tra il controllo e l'inserimento → atomico rispetto ad altre
      // richieste concorrenti.
      const key = normalizeEmail(entry.businessEmail);
      if (byEmail.has(key)) return false;
      byEmail.set(key, entry);
      return true;
    },
    async release(businessEmail, signatureId) {
      const key = normalizeEmail(businessEmail);
      const existing = byEmail.get(key);
      if (existing && existing.signatureId === signatureId) byEmail.delete(key);
    },
  };
}
