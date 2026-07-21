/**
 * Test della copia dell'NDA all'AZIENDA (spec #26) in `sendNdaEmail`.
 *
 * Il pacchetto `resend` è MOCKATO (nessuna rete): la fake `emails.send` registra
 * le chiamate e restituisce esiti controllati. Verifichiamo il gating
 * `NDA_COPY_TO_COMPANY`, l'invio SEPARATO al firmatario (l'owner non è tra i
 * destinatari della copia) e la natura BEST-EFFORT (una copia fallita non
 * invalida la firma).
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
  pdf: new Uint8Array([1, 2, 3]),
};

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({ data: { id: "e1" }, error: null });
});

afterEach(() => {
  delete process.env.NDA_COPY_TO_COMPANY;
  vi.restoreAllMocks();
});

describe("NDA — copia all'azienda (sendNdaEmail)", () => {
  it("copyToCompany:false → invio SOLO all'owner, companyCopySent:false", async () => {
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: false });
    expect(r).toEqual({ sent: true, id: "e1", companyCopySent: false });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0].to).toEqual([OWNER]);
  });

  it("copyToCompany:true → seconda email al firmatario (owner NON incluso)", async () => {
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    expect(r).toEqual({ sent: true, id: "e1", companyCopySent: true });
    expect(sendMock).toHaveBeenCalledTimes(2);
    // 1ª = owner, 2ª = firmatario, in invii SEPARATI (owner non svelato)
    expect(sendMock.mock.calls[0][0].to).toEqual([OWNER]);
    expect(sendMock.mock.calls[1][0].to).toEqual(["john@acme.com"]);
    expect(sendMock.mock.calls[1][0].to).not.toContain(OWNER);
  });

  it("gating via env NDA_COPY_TO_COMPANY=1 quando opts non specificato", async () => {
    process.env.NDA_COPY_TO_COMPANY = "1";
    const r = await sendNdaEmail(INPUT, { apiKey: "k" });
    expect(r).toMatchObject({ sent: true, companyCopySent: true });
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it("copia fallita è BEST-EFFORT: firma valida, companyCopySent:false", async () => {
    sendMock
      .mockResolvedValueOnce({ data: { id: "e1" }, error: null }) // owner OK
      .mockResolvedValueOnce({ data: null, error: { message: "bounce" } }); // copia KO
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    expect(r).toEqual({ sent: true, id: "e1", companyCopySent: false });
    expect(sendMock).toHaveBeenCalledTimes(2); // la copia è stata TENTATA
  });

  it("errore invio all'owner → sent:false e nessuna copia tentata", async () => {
    sendMock.mockResolvedValueOnce({ data: null, error: { message: "down" } });
    const r = await sendNdaEmail(INPUT, { apiKey: "k", copyToCompany: true });
    expect(r).toMatchObject({ sent: false, reason: "error" });
    expect(sendMock).toHaveBeenCalledTimes(1); // owner fallito → stop
  });

  it("senza apiKey resta degradato (no-api-key), nessun invio", async () => {
    const r = await sendNdaEmail(INPUT, { copyToCompany: true });
    expect(r).toEqual({ sent: false, reason: "no-api-key" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("buildCompanyEmailText: dati del firmatario, nessuna newline iniettata", () => {
    const t = buildCompanyEmailText({
      ...INPUT,
      fullName: "John\r\nBcc: evil@x.com",
    });
    expect(t).toContain("Acme");
    expect(t).toContain("snz_nda_abcd1234");
    const greet = t.split("\n").filter(l => l.startsWith("Gentile"));
    expect(greet).toHaveLength(1);
    expect(greet[0]).toBe("Gentile JohnBcc: evil@x.com,");
  });
});
