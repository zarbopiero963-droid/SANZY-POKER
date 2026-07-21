/**
 * Test della copia dell'NDA all'AZIENDA (spec #26) in `sendNdaEmail`.
 *
 * Il pacchetto `resend` è MOCKATO (nessuna rete): la fake `emails.send` registra
 * le chiamate e restituisce esiti controllati. Verifichiamo il gating
 * `NDA_COPY_TO_COMPANY`, l'invio SEPARATO al firmatario (l'owner non è tra i
 * destinatari della copia), la localizzazione IT/EN, il `replyTo` all'owner e la
 * natura FIRE-AND-FORGET (la copia parte in background: NON aggiunge latenza al
 * percorso critico e un suo errore non tocca l'esito della firma).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { sendMock } = vi.hoisted(() => ({ sendMock: vi.fn() }));
vi.mock("resend", () => ({
  Resend: vi.fn(() => ({ emails: { send: sendMock } })),
}));

import {
  sendNdaEmail,
  buildCompanyEmailText,
  type NdaEmailInput,
} from "../server/nda/email";

const OWNER = "pier.zar69@gmail.com";
const INPUT: NdaEmailInput = {
  signatureId: "snz_nda_abcd1234",
  fullName: "John Doe",
  businessEmail: "john@acme.com",
  companyName: "Acme",
  jobTitle: "Product Manager",
  ip: "1.2.3.4",
  acceptedAt: "2026-07-20T10:00:00.000Z",
  ndaVersion: "1.0-clickwrap",
  ndaLocale: "it",
  pdf: new Uint8Array([1, 2, 3]),
};

/** Lascia settlare la copia in background (fire-and-forget) prima del prossimo test. */
const flush = () => new Promise(r => setTimeout(r, 0));

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "e1" }, error: null });
});

afterEach(async () => {
  await flush();
  delete process.env.NDA_COPY_TO_COMPANY;
  vi.restoreAllMocks();
});

describe("NDA — copia all'azienda (sendNdaEmail)", () => {
  it("copyToCompany:false → invio SOLO all'owner, companyCopyRequested:false", async () => {
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: false });
    expect(r).toEqual({ sent: true, id: "e1", companyCopyRequested: false });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toEqual([OWNER]);
  });

  it("copyToCompany:true → copia al firmatario (owner NON incluso, replyTo owner)", async () => {
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    expect(r).toEqual({ sent: true, id: "e1", companyCopyRequested: true });
    // La send della copia è invocata sincronicamente (prima dell'await interno).
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0][0].to).toEqual([OWNER]); // owner
    const copy = sendMock.mock.calls[1][0]; // firmatario, invio SEPARATO
    expect(copy.to).toEqual(["john@acme.com"]);
    expect(copy.to).not.toContain(OWNER);
    expect(copy.replyTo).toBe(OWNER); // «rispondi a questa email» → owner
  });

  it("gating via env NDA_COPY_TO_COMPANY=1 quando opts non specificato", async () => {
    process.env.NDA_COPY_TO_COMPANY = "1";
    const r = await sendNdaEmail(INPUT, { apiKey: "k" });
    expect(r).toMatchObject({ sent: true, companyCopyRequested: true });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("FIRE-AND-FORGET: una copia che fallisce NON tocca l'esito della firma", async () => {
    sendMock
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null }) // owner OK
      .mockResolvedValueOnce({ data: null, error: { message: "bounce" } }); // copia KO
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    // La firma resta valida e companyCopyRequested resta true (invio AVVIATO).
    expect(r).toEqual({ sent: true, id: "e1", companyCopyRequested: true });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("FIRE-AND-FORGET: una copia che LANCIA non produce unhandled rejection", async () => {
    sendMock
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null }) // owner OK
      .mockRejectedValueOnce(new Error("network down")); // copia rigetta
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    expect(r).toEqual({ sent: true, id: "e1", companyCopyRequested: true });
    await flush(); // il catch interno assorbe il reject (nessun unhandled)
  });

  it("errore invio all'owner → sent:false e nessuna copia tentata", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    expect(r).toMatchObject({ sent: false, reason: "error" });
    expect(sendMock).toHaveBeenCalledTimes(1); // owner fallito → stop, niente copia
  });

  it("senza apiKey resta degradato (no-api-key), nessun invio", async () => {
    const r = await sendNdaEmail(INPUT, { copyToCompany: true });
    expect(r).toEqual({ sent: false, reason: "no-api-key" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("buildCompanyEmailText IT: dati del firmatario, nessuna newline iniettata", () => {
    const t = buildCompanyEmailText({
      ...INPUT,
      ndaLocale: "it",
      fullName: "John\r\nBcc: evil@x.com",
    });
    expect(t).toContain("Acme");
    expect(t).toContain("snz_nda_abcd1234");
    expect(t).toContain("Gentile"); // saluto italiano
    const greet = t.split("\n").filter(l => l.startsWith("Gentile"));
    expect(greet).toHaveLength(1);
    expect(greet[0]).toBe("Gentile JohnBcc: evil@x.com,");
  });

  it("buildCompanyEmailText EN: un firmatario in inglese riceve testo inglese", () => {
    const t = buildCompanyEmailText({ ...INPUT, ndaLocale: "en" });
    expect(t.startsWith("Dear John Doe,")).toBe(true);
    expect(t).toContain("Signature ID: snz_nda_abcd1234");
    expect(t).not.toContain("Gentile");
  });
});
