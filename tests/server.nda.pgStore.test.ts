/**
 * Test dell'implementazione DUREVOLE `createPostgresSignatureStore` (PR3 #30).
 *
 * Usa `pg-mem` (Postgres in-memory) per esercitare l'SQL REALE senza un DB
 * esterno: vincoli PRIMARY KEY / UNIQUE, `ON CONFLICT DO NOTHING`, e la
 * classificazione reserved/replay/duplicate_email. Stessi invarianti della
 * versione in-memory, ma sul motore SQL.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { newDb, type IMemoryDb } from "pg-mem";
import {
  createPostgresSignatureStore,
  ensureSchema,
  pruneExpired,
  ROW_RETENTION_MS,
} from "../server/nda/pgStore";
import { IDEM_TTL_MS } from "../client/src/business/demoSession";
import type { SignatureStore, StoredSignature } from "../server/nda/store";
import type { Pool } from "pg";

function entry(over: Partial<StoredSignature> = {}): StoredSignature {
  return {
    idempotencyKey: over.idempotencyKey ?? "k1",
    businessEmail: over.businessEmail ?? "John@Acme.com",
    signatureId: over.signatureId ?? "snz_nda_s1",
    password: over.password ?? "SANZY-ABCD-EFGH",
    startedAt: over.startedAt ?? 1_800_000_000_000,
    ndaVersion: over.ndaVersion ?? "1.0-clickwrap",
    serverAcknowledged: over.serverAcknowledged ?? false,
    companyCopyRequested: over.companyCopyRequested ?? false,
  };
}

let db: IMemoryDb;
let pool: Pool;
let store: SignatureStore;

beforeEach(async () => {
  db = newDb();
  pool = new (db.adapters.createPg().Pool)() as unknown as Pool;
  await ensureSchema(pool);
  store = createPostgresSignatureStore(pool);
});

describe("NDA — store Postgres (pg-mem, SQL reale)", () => {
  it("INVARIANTE: TTL chiave client > retention righe server (anti-lockout)", () => {
    // Il TTL client DEVE superare la retention server (che è una soglia
    // opportunistica = minimo, non massimo): se fosse ≤, un retry al margine
    // rigenererebbe la chiave mentre la riga server esiste ancora → 409 lockout.
    expect(IDEM_TTL_MS).toBeGreaterThan(ROW_RETENTION_MS);
  });

  it("reserve prima volta → reserved e recuperabile per chiave", async () => {
    expect((await store.reserve(entry())).status).toBe("reserved");
    const r = await store.getByIdempotencyKey("k1");
    expect(r?.signatureId).toBe("snz_nda_s1");
    expect(r?.startedAt).toBe(1_800_000_000_000); // BIGINT → number
    expect(r?.businessEmail).toBe("john@acme.com"); // normalizzata
  });

  it("stessa email + chiave DIVERSA → duplicate_email (UNIQUE business_email)", async () => {
    await store.reserve(entry({ idempotencyKey: "k1" }));
    const dup = await store.reserve(
      entry({ idempotencyKey: "k2", signatureId: "snz_nda_s2" })
    );
    expect(dup.status).toBe("duplicate_email");
    // case-insensitive: la stessa email con altro case è comunque duplicata
    const dup2 = await store.reserve(
      entry({
        idempotencyKey: "k3",
        businessEmail: "john@acme.com",
        signatureId: "snz_nda_s3",
      })
    );
    expect(dup2.status).toBe("duplicate_email");
  });

  it("stessa idempotencyKey → replay del record (no 409, stessa sessione)", async () => {
    await store.reserve(entry({ idempotencyKey: "k1" }));
    // replay anche con case/spazi diversi dell'email (normalizzazione coerente)
    const again = await store.reserve(
      entry({ idempotencyKey: "k1", businessEmail: "  JOHN@acme.com " })
    );
    expect(again.status).toBe("replay");
    if (again.status === "replay") {
      expect(again.record.signatureId).toBe("snz_nda_s1");
      expect(again.record.password).toBe("SANZY-ABCD-EFGH");
    }
  });

  it("stessa chiave ma email DIVERSA → NON fa replay (niente leak cross-email)", async () => {
    await store.reserve(
      entry({ idempotencyKey: "k1", businessEmail: "a@b.com" })
    );
    const other = await store.reserve(
      entry({ idempotencyKey: "k1", businessEmail: "evil@x.com" })
    );
    expect(other.status).toBe("duplicate_email"); // MAI "replay"
  });

  it("retention: una riga oltre la finestra viene cancellata al reserve successivo", async () => {
    // Il prune opportunistico è campionato (~3%): forzo Math.random sotto soglia
    // così il percorso è deterministico in test (la retention garantita resta
    // comunque il timer schedulato / `pruneExpired` diretto, testati a parte).
    const rnd = vi.spyOn(Math, "random").mockReturnValue(0);
    try {
      await store.reserve(
        entry({ idempotencyKey: "old", businessEmail: "a@b.com" })
      );
      // invecchia la riga oltre i 30 giorni di retention
      await pool.query("UPDATE nda_signatures SET created_at = $1", [
        new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      ]);
      // il reserve successivo pota le righe scadute → l'email è di nuovo prenotabile
      const r = await store.reserve(
        entry({ idempotencyKey: "new", businessEmail: "a@b.com" })
      );
      expect(r.status).toBe("reserved");
      expect(await store.getByIdempotencyKey("old")).toBeUndefined();
    } finally {
      rnd.mockRestore();
    }
  });

  it("il prune opportunistico è campionato: sopra soglia NON pota sul reserve", async () => {
    // Con Math.random ≥ soglia il reserve NON esegue il DELETE (evita la
    // scrittura per-richiesta): la riga scaduta resta finché non interviene il
    // timer schedulato. Prova che il gate probabilistico è realmente attivo.
    const rnd = vi.spyOn(Math, "random").mockReturnValue(0.99);
    try {
      await store.reserve(
        entry({ idempotencyKey: "old", businessEmail: "a@b.com" })
      );
      await pool.query("UPDATE nda_signatures SET created_at = $1", [
        new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
      ]);
      await store.reserve(
        entry({ idempotencyKey: "k2", businessEmail: "c@d.com" })
      );
      // non potata dal reserve (gate sopra soglia)
      expect(await store.getByIdempotencyKey("old")).toBeDefined();
    } finally {
      rnd.mockRestore();
    }
  });

  it("pruneExpired (cleanup schedulato) pota le righe scadute anche senza reserve", async () => {
    // Il timer schedulato (server/index.ts) chiama pruneExpired direttamente:
    // deve cancellare le righe oltre la finestra SENZA passare da un reserve,
    // così la password at-rest non sopravvive con traffico nullo.
    await store.reserve(
      entry({ idempotencyKey: "old", businessEmail: "a@b.com" })
    );
    await store.reserve(
      entry({
        idempotencyKey: "fresh",
        businessEmail: "c@d.com",
        signatureId: "snz_nda_s2",
      })
    );
    // invecchia SOLO la prima riga oltre i 30 giorni
    await pool.query(
      "UPDATE nda_signatures SET created_at = $1 WHERE idempotency_key = 'old'",
      [new Date(Date.now() - 40 * 24 * 60 * 60 * 1000)]
    );
    await pruneExpired(pool);
    expect(await store.getByIdempotencyKey("old")).toBeUndefined();
    expect(await store.getByIdempotencyKey("fresh")).toBeDefined();
  });

  it("pruneExpired è best-effort: un errore del DELETE non rilancia", async () => {
    // Se il pool query fallisce, pruneExpired logga e NON rilancia (né la firma
    // né il timer schedulato devono cadere per un errore di cleanup).
    const brokenPool = {
      query: () => Promise.reject(new Error("db down")),
    } as unknown as Pool;
    await expect(pruneExpired(brokenPool)).resolves.toBeUndefined();
  });

  it("finalize aggiorna l'esito email persistito", async () => {
    await store.reserve(entry({ idempotencyKey: "k1" }));
    await store.finalize("k1", {
      serverAcknowledged: true,
      companyCopyRequested: true,
    });
    const r = await store.getByIdempotencyKey("k1");
    expect(r?.serverAcknowledged).toBe(true);
    expect(r?.companyCopyRequested).toBe(true);
  });

  it("release libera solo col signatureId giusto; poi l'email è riprenotabile", async () => {
    await store.reserve(
      entry({ idempotencyKey: "k1", signatureId: "snz_nda_s1" })
    );
    await store.release("john@acme.com", "wrong");
    expect(await store.getByIdempotencyKey("k1")).toBeDefined();
    await store.release("John@Acme.com", "snz_nda_s1");
    expect(await store.getByIdempotencyKey("k1")).toBeUndefined();
    expect((await store.reserve(entry({ idempotencyKey: "k9" }))).status).toBe(
      "reserved"
    );
  });
});
