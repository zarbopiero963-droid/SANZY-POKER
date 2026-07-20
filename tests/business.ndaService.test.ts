/**
 * Test del client `submitNda` (PR2, tracking #26).
 *
 * Verifica la validazione RIGOROSA della risposta del server: in particolare
 * che un `startedAt` fuori dal range rappresentabile da `Date` (|t| > 8.64e15)
 * venga rifiutato PRIMA che `new Date(startedAt).toISOString()` a valle lanci
 * `RangeError` (schermata rotta). `global.fetch` è mockato: nessuna rete.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import { submitNda } from "../client/src/business/ndaService";
import type { NdaForm } from "../client/src/business/demoSession";

const FORM: NdaForm = {
  fullName: "John Doe",
  businessEmail: "john.doe@softswiss.com",
  companyName: "Softswiss",
  jobTitle: "Product Manager",
  accepted: true,
};

function mockFetchJson(status: number, body: unknown) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
  global.fetch = vi.fn().mockResolvedValue(res) as unknown as typeof fetch;
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("submitNda — validazione risposta server", () => {
  it("startedAt oltre il range Date (8.64e15+1) → bad_response (niente RangeError)", async () => {
    // Regressione: startedAt enorme supererebbe Number.isFinite/>0 ma farebbe
    // lanciare new Date(startedAt).toISOString() a valle.
    mockFetchJson(200, {
      ok: true,
      signatureId: "snz_nda_x",
      password: "SANZY-ABCD-EFGH",
      startedAt: 8.64e15 + 1,
      serverAcknowledged: true,
    });
    const r = await submitNda(FORM, "it");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("bad_response");
    // Prova che il valore rifiutato avrebbe davvero rotto Date:
    expect(() => new Date(8.64e15 + 1).toISOString()).toThrow(RangeError);
  });

  it("startedAt non intero → bad_response", async () => {
    mockFetchJson(200, {
      ok: true,
      signatureId: "snz_nda_x",
      password: "SANZY-ABCD-EFGH",
      startedAt: 1.5,
      serverAcknowledged: true,
    });
    const r = await submitNda(FORM, "it");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("bad_response");
  });

  it("risposta valida → ok con i valori del server", async () => {
    const now = 1_800_000_000_000;
    mockFetchJson(200, {
      ok: true,
      signatureId: "snz_nda_real",
      password: "SANZY-WXYZ-1234",
      startedAt: now,
      serverAcknowledged: true,
    });
    const r = await submitNda(FORM, "en");
    expect(r).toEqual({
      ok: true,
      signatureId: "snz_nda_real",
      password: "SANZY-WXYZ-1234",
      startedAt: now,
      serverAcknowledged: true,
    });
    // startedAt accettato è rappresentabile da Date (nessun throw a valle).
    expect(() => new Date(r.startedAt).toISOString()).not.toThrow();
  });

  it("errore server (409) → propaga il codice d'errore", async () => {
    mockFetchJson(409, { ok: false, error: "already_signed" });
    const r = await submitNda(FORM, "it");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("already_signed");
  });

  it("fetch che lancia (rete) → network", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValue(new Error("offline")) as unknown as typeof fetch;
    const r = await submitNda(FORM, "it");
    expect(r.error).toBe("network");
  });
});
