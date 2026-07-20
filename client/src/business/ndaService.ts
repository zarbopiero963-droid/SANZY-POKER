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
  /** Codice d'errore server (`already_signed`, `unsupported_nda_version`, …). */
  error?: string;
};

const FAIL = (error: string): NdaSignResult => ({
  ok: false,
  signatureId: "",
  password: "",
  startedAt: 0,
  serverAcknowledged: false,
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
  let res: Response;
  try {
    res = await fetch("/api/nda/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
  // Validazione rigorosa: niente stringhe vuote, niente NaN/Infinity, timestamp
  // positivo (altrimenti `new Date(startedAt).toISOString()` a valle lancerebbe).
  if (
    typeof data.signatureId !== "string" ||
    data.signatureId.length === 0 ||
    typeof data.password !== "string" ||
    data.password.length === 0 ||
    typeof data.startedAt !== "number" ||
    !Number.isFinite(data.startedAt) ||
    data.startedAt <= 0
  ) {
    return FAIL("bad_response");
  }
  return {
    ok: true,
    signatureId: data.signatureId,
    password: data.password,
    startedAt: data.startedAt,
    serverAcknowledged: Boolean(data.serverAcknowledged),
  };
}
