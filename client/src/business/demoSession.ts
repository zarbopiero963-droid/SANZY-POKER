/**
 * Logica pura della demo B2B protetta da NDA (idea #12, tracking #26).
 *
 * Qui NON c'è React né rendering: solo funzioni deterministiche e testabili
 * offline (timer, password di sessione, payload dell'NDA, validazione del
 * modulo). La persistenza su `localStorage` è isolata in fondo al file e
 * protetta da try/catch, così il resto resta puro.
 *
 * NB: questo modulo non tocca il motore di gioco. Il timer e il gate della demo
 * sono lato client per il PR1 (frontend); l'ancoraggio server-side anti-abuso
 * arriva nel PR backend (vedi #26).
 */
import { nanoid } from "nanoid";
import type { BizLocale } from "./landingI18n";

/** Durata della demo: 15 minuti, come richiesto nell'idea #12. */
export const DEMO_DURATION_MS = 15 * 60 * 1000;

/**
 * Versione del testo NDA presentato all'utente. Fa parte del payload firmato:
 * un click-wrap è verificabile solo se registra QUALE testo è stato accettato.
 * Va incrementata a ogni modifica sostanziale del testo dell'NDA. Nel PR1 il
 * testo è ammorbidito (nulla è ancora registrato lato server); il PR2 (#26)
 * ripristina il testo legale pieno e alza questa versione.
 */
export const NDA_VERSION = "pr1-draft-1";

/** Dati raccolti dal manager nelle 3 slide del popup NDA. */
export type NdaForm = {
  fullName: string;
  businessEmail: string;
  companyName: string;
  jobTitle: string;
  accepted: boolean;
};

/** Payload "firmato" pronto per il backend (PR2): dati + prova della firma. */
export type NdaPayload = {
  fullName: string;
  businessEmail: string;
  companyName: string;
  jobTitle: string;
  signatureId: string;
  acceptedAt: string; // ISO 8601 (UTC)
  ndaVersion: string; // versione del testo NDA accettato (auditabilità)
  ndaLocale: BizLocale; // lingua in cui l'NDA è stato mostrato e accettato
};

/** Sessione demo persistita: prova della firma + istante di avvio del timer. */
export type DemoSession = {
  signatureId: string;
  password: string;
  startedAt: number; // epoch ms: fissato alla firma, NON al refresh
  payload: NdaPayload;
};

/**
 * Email valida in modo pragmatico (una @, un dominio con punto). Non pretende
 * la RFC completa: serve solo a bloccare input palesemente errati nel modulo.
 */
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  if (v.length < 5 || v.length > 254) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

/** Codici d'errore per campo (usati per comporre le chiavi i18n `nda.error.*`). */
export type NdaFieldError = "required" | "email";

/** Errori del modulo NDA, per campo. Oggetto vuoto = modulo valido. */
export type NdaFormErrors = Partial<Record<keyof NdaForm, NdaFieldError>>;

/**
 * Valida i dati delle 3 slide. Tutti i campi testuali sono obbligatori,
 * l'email deve essere valida e la checkbox dell'NDA deve essere spuntata.
 */
export function validateNdaForm(form: NdaForm): NdaFormErrors {
  const errors: NdaFormErrors = {};
  if (!form.fullName.trim()) errors.fullName = "required";
  if (!form.businessEmail.trim()) errors.businessEmail = "required";
  else if (!isValidEmail(form.businessEmail)) errors.businessEmail = "email";
  if (!form.companyName.trim()) errors.companyName = "required";
  if (!form.jobTitle.trim()) errors.jobTitle = "required";
  if (!form.accepted) errors.accepted = "required";
  return errors;
}

/** True se il modulo non ha errori. */
export function isNdaFormValid(form: NdaForm): boolean {
  return Object.keys(validateNdaForm(form)).length === 0;
}

/**
 * Password di sessione temporanea mostrata dopo la firma. Formato leggibile
 * `SANZY-XXXX-XXXX` con alfabeto senza caratteri ambigui (niente 0/O/1/I/L).
 * Usa `crypto.getRandomValues` (non `Math.random`) come sorgente casuale, così
 * il codice non è prevedibile anche se nel PR2 diventasse una credenziale reale.
 */
const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(length: number): string {
  const n = PW_ALPHABET.length;
  // Massimo multiplo di n rappresentabile in Uint32: scartando i valori oltre
  // questa soglia si elimina il modulo bias (rejection sampling).
  const limit = Math.floor(0x1_0000_0000 / n) * n;
  const buf = new Uint32Array(1);
  let out = "";
  while (out.length < length) {
    crypto.getRandomValues(buf);
    if (buf[0] >= limit) continue;
    out += PW_ALPHABET[buf[0] % n];
  }
  return out;
}

export function generateSessionPassword(): string {
  return `SANZY-${randomBlock(4)}-${randomBlock(4)}`;
}

/**
 * Costruisce il payload firmato a partire dal modulo. `acceptedAt` è l'istante
 * (ISO) del consenso; `signatureId` identifica univocamente la firma;
 * `ndaVersion`/`ndaLocale` registrano QUALE testo (e in che lingua) è stato
 * accettato, requisito minimo di auditabilità di un click-wrap.
 */
export function buildNdaPayload(
  form: NdaForm,
  {
    signatureId,
    acceptedAt,
    ndaLocale,
    ndaVersion = NDA_VERSION,
  }: {
    signatureId: string;
    acceptedAt: string;
    ndaLocale: BizLocale;
    ndaVersion?: string;
  }
): NdaPayload {
  return {
    fullName: form.fullName.trim(),
    businessEmail: form.businessEmail.trim(),
    companyName: form.companyName.trim(),
    jobTitle: form.jobTitle.trim(),
    signatureId,
    acceptedAt,
    ndaVersion,
    ndaLocale,
  };
}

/**
 * Crea una nuova sessione demo al momento della firma. `now` è iniettabile per
 * i test; in produzione si passa `Date.now()`. `ndaLocale` è la lingua in cui
 * l'utente ha letto e accettato l'NDA (registrata nel payload).
 */
export function createDemoSession(
  form: NdaForm,
  now: number,
  ndaLocale: BizLocale
): DemoSession {
  const signatureId = nanoid();
  const acceptedAt = new Date(now).toISOString();
  return {
    signatureId,
    password: generateSessionPassword(),
    startedAt: now,
    payload: buildNdaPayload(form, { signatureId, acceptedAt, ndaLocale }),
  };
}

/**
 * Millisecondi rimanenti della demo. Dipende solo da `startedAt` (fissato alla
 * firma) e `now`: al refresh `startedAt` non cambia, quindi il timer PROSEGUE e
 * non riparte. Mai negativo.
 */
export function computeRemainingMs(
  startedAt: number,
  now: number,
  totalMs: number = DEMO_DURATION_MS
): number {
  return Math.max(0, startedAt + totalMs - now);
}

/** True quando la demo è scaduta (tempo rimanente a zero). */
export function isExpired(
  startedAt: number,
  now: number,
  totalMs: number = DEMO_DURATION_MS
): boolean {
  return computeRemainingMs(startedAt, now, totalMs) <= 0;
}

/** Formatta i millisecondi rimanenti come `MM:SS` (arrotondando per eccesso ai secondi). */
export function formatCountdown(remainingMs: number): string {
  const totalSeconds = Math.ceil(Math.max(0, remainingMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(minutes)}:${pad(seconds)}`;
}

// --- Persistenza (isolata, best-effort) -----------------------------------

const STORAGE_KEY = "sanzy.demo.session";

/**
 * Sottoinsieme persistito della sessione: il MINIMO per riprendere la demo dopo
 * un refresh (firma, password, avvio del timer). NON contiene la PII del
 * payload (nome/email/azienda/ruolo): quella resta in memoria e verrà inviata
 * al server al momento della firma (PR2), non salvata in `localStorage`.
 */
export type PersistedSession = {
  signatureId: string;
  password: string;
  startedAt: number;
};

/**
 * Type guard della sessione minimale ricaricata da storage. Oltre ai tipi,
 * rifiuta stringhe vuote e un `startedAt` nel futuro: non rende il gate
 * inviolabile — resta client-side, vedi #26 — ma scarta i dati palesemente
 * manomessi che allungherebbero la demo. `now` è iniettato dal chiamante così
 * la funzione resta pura (nessuna lettura implicita dell'orologio).
 */
function isPersistedSession(
  value: unknown,
  now: number
): value is PersistedSession {
  if (!value || typeof value !== "object") return false;
  const s = value as Record<string, unknown>;
  if (
    typeof s.signatureId !== "string" ||
    s.signatureId.length === 0 ||
    typeof s.password !== "string" ||
    s.password.length === 0 ||
    typeof s.startedAt !== "number" ||
    !Number.isFinite(s.startedAt)
  ) {
    return false;
  }
  // Uno `startedAt` futuro allungherebbe la demo oltre i 15 minuti: si scarta.
  return s.startedAt <= now;
}

/**
 * Salva SOLO i campi minimi necessari (no PII). Best-effort: se lo storage è
 * disabilitato non lancia, la demo resta valida per la sessione corrente.
 *
 * TODO(PR2 #26): la `password` è qui in chiaro in `localStorage`. Va bene per il
 * PR1 (è solo una chiave di sblocco lato client, non una credenziale reale), ma
 * quando il PR2 renderà la password server-authoritative NON va persistita in
 * chiaro: conservare solo il `signatureId` e riconvalidare col server.
 */
export function saveDemoSession(session: DemoSession | PersistedSession): void {
  try {
    const persisted: PersistedSession = {
      signatureId: session.signatureId,
      password: session.password,
      startedAt: session.startedAt,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persisted));
  } catch {
    // Storage non disponibile: la demo resta valida per la sessione corrente.
  }
}

/**
 * Ricarica la sessione demo minimale salvata, o `null` se assente/illeggibile.
 * `now` è iniettabile per i test; in produzione si passa `Date.now()`.
 */
export function loadDemoSession(
  now: number = Date.now()
): PersistedSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPersistedSession(parsed, now) ? parsed : null;
  } catch {
    return null;
  }
}

/** Elimina la sessione demo salvata. */
export function clearDemoSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // no-op
  }
}
