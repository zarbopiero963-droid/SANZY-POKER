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
    const subject = `NDA firmato — ${input.companyName} (${input.signatureId})`;
    const filename = `NDA-SanzyPoker-${input.signatureId}.pdf`;
    const { data, error } = await resend.emails.send({
      from,
      to: [OWNER_EMAIL],
      replyTo: input.businessEmail,
      subject,
      text: buildEmailText(input),
      attachments: [
        { filename, content: Buffer.from(input.pdf).toString("base64") },
      ],
    });
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

/** Corpo testuale dell'email (riassunto della firma; il PDF è in allegato). */
export function buildEmailText(input: NdaEmailInput): string {
  return [
    "Nuova firma NDA per la demo di Sanzy Poker.",
    "",
    `Nome: ${input.fullName}`,
    `Azienda: ${input.companyName}`,
    `Ruolo: ${input.jobTitle}`,
    `Email aziendale: ${input.businessEmail}`,
    `ID firma: ${input.signatureId}`,
    `IP: ${input.ip}`,
    `Timestamp (UTC): ${input.acceptedAt}`,
    `Versione NDA: ${input.ndaVersion}`,
    "",
    "Il PDF dell'NDA firmato è in allegato.",
  ].join("\n");
}
