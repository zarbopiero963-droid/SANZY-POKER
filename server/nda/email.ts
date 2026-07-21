/**
 * Invio dell'NDA firmato via email (Resend) — PR2, tracking #26.
 *
 * Degrada con grazia: se `RESEND_API_KEY` non è configurata (dev, CI, o Secret
 * non ancora impostato dall'owner) NON lancia e NON blocca la firma — ritorna
 * `{ sent: false, reason: "no-api-key" }`. La chiave NON sta MAI nel repo: è un
 * Secret di ambiente (Railway / GitHub Actions).
 *
 * Destinatario: pier.zar69@gmail.com (owner). Il "from" richiede un dominio
 * verificato su Resend; finché non c'è, in test mode Resend consegna solo
 * all'email dell'account — che è quella dell'owner, quindi funziona.
 */
export type EmailResult =
  | { sent: true; id: string }
  | { sent: false; reason: "no-api-key" | "error"; detail?: string };

export type NdaEmailInput = {
  signatureId: string;
  fullName: string;
  businessEmail: string;
  companyName: string;
  jobTitle: string;
  ip: string;
  acceptedAt: string;
  ndaVersion: string;
  pdf: Uint8Array;
};

const OWNER_EMAIL = "pier.zar69@gmail.com";
const DEFAULT_FROM = "Sanzy Poker <onboarding@resend.dev>";
/** Timeout (ms) sull'invio Resend: oltre, si rigetta e si rilascia la firma. */
const SEND_TIMEOUT_MS = 15000;

/**
 * Applica un timeout a una promise che l'SDK non sa annullare: se `promise`
 * non si risolve entro `ms`, il race rigetta con un Error (gestito dal `catch`
 * di `sendNdaEmail`). Il timer è sempre ripulito per non lasciare handle appesi.
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`timeout dopo ${ms}ms`)), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Invia l'email con il PDF dell'NDA in allegato. Iniettabile `apiKey`/`from`
 * per i test; in produzione legge `process.env`.
 */
export async function sendNdaEmail(
  input: NdaEmailInput,
  opts: { apiKey?: string; from?: string } = {}
): Promise<EmailResult> {
  const apiKey = opts.apiKey ?? process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { sent: false, reason: "no-api-key" };
  }
  const from = opts.from ?? process.env.RESEND_FROM ?? DEFAULT_FROM;
  try {
    // Import dinamico: `resend` viene caricato solo quando c'è davvero una
    // chiave, così dev/test/CI non dipendono dal pacchetto a runtime.
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const subject = buildEmailSubject(input);
    const filename = `NDA-SanzyPoker-${safeAttachmentId(input.signatureId)}.pdf`;
    // Timeout reale sull'invio: l'SDK Resend non espone AbortSignal nella sua
    // superficie pubblica, quindi usiamo un `Promise.race`. Senza, una send
    // appesa terrebbe bloccata la prenotazione anti-replay a tempo indefinito;
    // allo scadere si rigetta e il `catch` esterno rilascia la prenotazione (503).
    const { data, error } = await withTimeout(
      resend.emails.send({
        from,
        to: [OWNER_EMAIL],
        replyTo: stripControl(input.businessEmail),
        subject,
        text: buildEmailText(input),
        attachments: [
          { filename, content: Buffer.from(input.pdf).toString("base64") },
        ],
      }),
      SEND_TIMEOUT_MS
    );
    if (error) {
      return {
        sent: false,
        reason: "error",
        detail: String(error.message ?? error),
      };
    }
    return { sent: true, id: data?.id ?? "" };
  } catch (err) {
    return {
      sent: false,
      reason: "error",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Rimuove i caratteri di controllo da una stringa: C0 (`\x00-\x1f`), DEL +
 * blocco C1 (`\x7f-\x9f`) e i separatori di riga Unicode U+2028/U+2029.
 * Difesa in profondità: a monte lo schema zod già li vieta, ma `sendNdaEmail`
 * è esportata e potrebbe essere chiamata con input non validati — un `\n` (o un
 * separatore C1/Unicode) nel subject/campi consentirebbe header injection.
 * Allineato alla whitelist WinAnsi del PDF (`toWinAnsiSafe`), che esclude i C1.
 */
export function stripControl(value: string): string {
  // eslint-disable-next-line no-control-regex -- rimozione voluta dei controlli
  return value.replace(/[\x00-\x1f\x7f-\x9f\u2028\u2029]/g, "");
}

/**
 * Nome file dell'allegato: whitelist rigida (`[A-Za-z0-9_-]`) contro header
 * `Content-Disposition` malformati. Il `signatureId` è server-generated e già
 * sicuro, ma la whitelist è coerente con la filosofia difesa-in-profondità.
 */
export function safeAttachmentId(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]/g, "");
}

/** Subject dell'email, sanitizzato (niente header injection). */
export function buildEmailSubject(input: NdaEmailInput): string {
  return `NDA firmato — ${stripControl(input.companyName)} (${stripControl(input.signatureId)})`;
}

/** Corpo testuale dell'email (riassunto della firma; il PDF è in allegato). */
export function buildEmailText(input: NdaEmailInput): string {
  const s = stripControl;
  return [
    "Nuova firma NDA per la demo di Sanzy Poker.",
    "",
    `Nome: ${s(input.fullName)}`,
    `Azienda: ${s(input.companyName)}`,
    `Ruolo: ${s(input.jobTitle)}`,
    `Email aziendale: ${s(input.businessEmail)}`,
    `ID firma: ${s(input.signatureId)}`,
    `IP: ${s(input.ip)}`,
    `Timestamp (UTC): ${s(input.acceptedAt)}`,
    `Versione NDA: ${s(input.ndaVersion)}`,
    "",
    "Il PDF dell'NDA firmato è in allegato.",
  ].join("\n");
}
