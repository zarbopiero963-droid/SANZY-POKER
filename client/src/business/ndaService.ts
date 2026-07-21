/**
 * Servizio di firma dell'NDA (PR2, tracking #26).
 *
 * Chiama l'endpoint reale `POST /api/nda/sign`: il server è AUTOREVOLE — genera
 * `signatureId`/`password`, fissa `startedAt` (istante server), rileva l'IP,
 * produce il PDF, logga e invia l'email a pier.zar69@gmail.com via Resend.
 * Il client invia solo il modulo + la lingua + la versione del testo NDA
 * mostrato, e USA i valori restituiti dal server (non ne impone di propri).
 */
import { NDA_VERSION, type NdaForm } from "./demoSession";
import type { BizLocale } from "./landingI18n";

export type NdaSignResult = {
  ok: boolean;
  signatureId: string;
  password: string;
  /** Istante (epoch ms) deciso dal server: avvio del timer demo. */
  startedAt: number;
  /** true quando email/PDF/log server sono andati a buon fine. */
  serverAcknowledged: boolean;
  /** true quando una COPIA dell'NDA è stata recapitata all'email aziendale. */
  companyCopySent: boolean;
  /** Codice d'errore server (`already_signed`, `unsupported_nda_version`, …). */
  error?: string;
};

/** Timeout della richiesta di firma (ms): oltre, si annulla e si segnala rete. */
const REQUEST_TIMEOUT_MS = 15000;

const FAIL = (error: string): NdaSignResult => ({
  ok: false,
  signatureId: "",
  password: "",
  startedAt: 0,
  serverAcknowledged: false,
  companyCopySent: false,
  error,
});

/**
 * Registra la firma sul backend. In caso di rete/HTTP non OK ritorna
 * `ok: false` con un codice d'errore (nessuna eccezione propagata al chiamante).
 */
export async function submitNda(
  form: NdaForm,
  locale: BizLocale
): Promise<NdaSignResult> {
  // Timeout finito: senza, una connessione appesa lascerebbe il dialog bloccato
  // su "Registrazione…" all'infinito (durante `submitting` Esc/chiudi sono
  // disabilitati). All'abort si segue il normale percorso FAIL("network"); il
  // timer viene sempre ripulito così lo stato di invio si sblocca.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch("/api/nda/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        fullName: form.fullName,
        businessEmail: form.businessEmail,
        companyName: form.companyName,
        jobTitle: form.jobTitle,
        accepted: form.accepted,
        ndaLocale: locale,
        ndaVersion: NDA_VERSION,
      }),
    });
  } catch {
    return FAIL("network");
  } finally {
    clearTimeout(timer);
  }

  let data: Partial<NdaSignResult> & { error?: string };
  try {
    data = (await res.json()) as typeof data;
  } catch {
    return FAIL("bad_response");
  }

  if (!res.ok || !data.ok) {
    return FAIL(data.error ?? "submit");
  }
  // Validazione rigorosa: niente stringhe vuote, timestamp intero positivo E
  // rappresentabile da `Date` (|t| ≤ 8.64e15). Senza il limite superiore un
  // `startedAt` enorme supererebbe `Number.isFinite`/`>0` ma farebbe lanciare
  // `new Date(startedAt).toISOString()` a valle (RangeError) → schermata rotta.
  const MAX_TIME = 8.64e15; // Date massima rappresentabile (ECMAScript)
  if (
    typeof data.signatureId !== "string" ||
    data.signatureId.length === 0 ||
    typeof data.password !== "string" ||
    data.password.length === 0 ||
    typeof data.startedAt !== "number" ||
    !Number.isSafeInteger(data.startedAt) ||
    data.startedAt <= 0 ||
    data.startedAt > MAX_TIME
  ) {
    return FAIL("bad_response");
  }
  return {
    ok: true,
    signatureId: data.signatureId,
    password: data.password,
    startedAt: data.startedAt,
    serverAcknowledged: Boolean(data.serverAcknowledged),
    companyCopySent: data.companyCopySent === true,
  };
}
