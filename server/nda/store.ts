/**
 * Store anti-replay delle firme NDA (PR2, tracking #26).
 *
 * Impedisce che la stessa email aziendale ottenga più demo (nuovo timer) a
 * ripetizione: "una demo per email". La chiave è l'email normalizzata.
 *
 * LIMITE DICHIARATO: lo store è IN-MEMORY. Railway è un ambiente effimero senza
 * DB/volume persistente, quindi lo store si azzera a ogni redeploy/restart del
 * processo. È accettabile per un gate di demo (deterrente, non sicurezza forte);
 * la durabilità (Postgres) è un'evoluzione isolata dietro questa interfaccia.
 */
export type StoredSignature = {
  signatureId: string;
  businessEmail: string;
  startedAt: number; // epoch ms della firma (autorevole lato server)
};

export interface SignatureStore {
  /** Firma già registrata per questa email? */
  has(businessEmail: string): boolean;
  /** Recupera la firma esistente per l'email (se presente). */
  get(businessEmail: string): StoredSignature | undefined;
  /** Registra una nuova firma. Lancia se l'email ha già firmato. */
  record(entry: StoredSignature): void;
}

/** Normalizza l'email per il confronto (trim + lowercase). */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Implementazione in-memory (per-processo). */
export function createInMemorySignatureStore(): SignatureStore {
  const byEmail = new Map<string, StoredSignature>();
  return {
    has(businessEmail) {
      return byEmail.has(normalizeEmail(businessEmail));
    },
    get(businessEmail) {
      return byEmail.get(normalizeEmail(businessEmail));
    },
    record(entry) {
      const key = normalizeEmail(entry.businessEmail);
      if (byEmail.has(key)) {
        throw new Error("signature already recorded for this email");
      }
      byEmail.set(key, entry);
    },
  };
}
