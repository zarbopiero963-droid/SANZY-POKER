/**
 * Logica pura della firma NDA lato server (PR2, tracking #26).
 *
 * Qui NON c'è Express: solo validazione (zod), generazione delle credenziali
 * server-authoritative e rendering del PDF. Tutto deterministico e testabile
 * offline (il PDF è deterministico a parità di input: timestamp e IP sono
 * passati come argomenti, non letti da `Date.now()`).
 */
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { z } from "zod";
import { fillNdaText, NDA_VERSION, type NdaLocale } from "./ndaText";

/** Schema del corpo di `POST /api/nda/sign`. Il server NON si fida del client:
 * signatureId/password/IP/timestamp sono generati/rilevati lato server. */
export const ndaSignRequestSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  businessEmail: z.string().trim().min(5).max(254).email(),
  companyName: z.string().trim().min(1).max(160),
  jobTitle: z.string().trim().min(1).max(120),
  accepted: z.literal(true),
  ndaLocale: z.enum(["it", "en"]),
  // versione del testo mostrata al client: deve combaciare con quella del server.
  ndaVersion: z.string().min(1).max(64),
});

export type NdaSignRequest = z.infer<typeof ndaSignRequestSchema>;

const PW_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomBlock(length: number): string {
  const n = PW_ALPHABET.length;
  // Rejection sampling: elimina il modulo bias scartando i valori oltre il
  // massimo multiplo di n rappresentabile in Uint32.
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

/** Password di sessione server-authoritative, formato `SANZY-XXXX-XXXX`. */
export function generateSessionPassword(): string {
  return `SANZY-${randomBlock(4)}-${randomBlock(4)}`;
}

/** Identificativo di firma server-authoritative (`snz_nda_<hex>`). */
export function generateSignatureId(): string {
  const buf = new Uint8Array(8);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `snz_nda_${hex}`;
}

/** True se la versione NDA dichiarata dal client combacia con quella del server. */
export function isSupportedNdaVersion(version: string): boolean {
  return version === NDA_VERSION;
}

export type SignedNdaRecord = {
  signatureId: string;
  fullName: string;
  businessEmail: string;
  companyName: string;
  jobTitle: string;
  ndaLocale: NdaLocale;
  ndaVersion: string;
  ip: string;
  acceptedAt: string; // ISO 8601 UTC
};

/** Riempie il testo NDA canonico con i dati firmati (per PDF/email). */
export function renderSignedNdaText(record: SignedNdaRecord): string {
  return fillNdaText(record.ndaLocale, {
    NOME: record.fullName,
    AZIENDA: record.companyName,
    EMAIL: record.businessEmail,
    IP: record.ip,
    TIMESTAMP: record.acceptedAt,
    SIGNATURE_ID: record.signatureId,
  });
}

/**
 * Rende una stringa sicura per il font WinAnsi (Helvetica standard di pdf-lib):
 * i caratteri non codificabili (es. CJK/cirillico/emoji in un nome aziendale
 * estero) farebbero LANCIARE `drawText` → 500. Vengono sostituiti con `?`.
 */
export function toWinAnsiSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    const cp = ch.codePointAt(0) ?? 0;
    const undefinedWinAnsi =
      cp === 0x81 || cp === 0x8d || cp === 0x8f || cp === 0x90 || cp === 0x9d;
    out += cp < 0x20 || cp > 0xff || undefinedWinAnsi ? "?" : ch;
  }
  return out;
}

/** Spezza un paragrafo in righe che stanno entro `maxWidth` alla dimensione data. */
function wrapLine(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // Parola singola più larga della pagina: la spezziamo per carattere.
      if (font.widthOfTextAtSize(word, size) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (font.widthOfTextAtSize(chunk + ch, size) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk += ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

/**
 * Genera il PDF dell'NDA firmato. Deterministico a parità di `record` (nessun
 * timestamp interno di pdf-lib: le date di creazione/modifica sono azzerate).
 */
export async function renderNdaPdf(
  record: SignedNdaRecord
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Sanzy Poker NDA — ${record.signatureId}`);
  doc.setAuthor("Piero Zambo");
  doc.setSubject(`NDA ${record.ndaVersion}`);
  // Date fisse: PDF riproducibile (utile ai test e all'audit).
  const epoch = new Date(0);
  doc.setCreationDate(epoch);
  doc.setModificationDate(epoch);

  const font = await doc.embedFont(StandardFonts.Helvetica);
  const size = 10;
  const lineHeight = 14;
  const margin = 50;

  let page = doc.addPage();
  let { width, height } = page.getSize();
  let y = height - margin;
  const maxWidth = width - margin * 2;

  const body = toWinAnsiSafe(renderSignedNdaText(record));
  const paragraphs = body.split("\n");

  for (const paragraph of paragraphs) {
    const lines = paragraph.trim()
      ? wrapLine(paragraph, font, size, maxWidth)
      : [""];
    for (const line of lines) {
      if (y < margin + lineHeight) {
        page = doc.addPage();
        ({ width, height } = page.getSize());
        y = height - margin;
      }
      page.drawText(line, {
        x: margin,
        y,
        size,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }
  }

  return doc.save();
}
