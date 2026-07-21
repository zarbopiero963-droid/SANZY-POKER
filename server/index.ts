import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createNdaRouter } from "./nda/router";
import { createInMemorySignatureStore, type SignatureStore } from "./nda/store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sceglie lo store delle firme: **Postgres durevole** se `DATABASE_URL` è
 * configurata (import dinamico di `pg`, così non è richiesto a runtime quando
 * non serve), altrimenti **in-memory** effimero (dev/CI, o produzione non ancora
 * provisionata — come l'email senza `RESEND_API_KEY`). Se l'init Postgres
 * fallisce si degrada all'in-memory invece di impedire l'avvio del server.
 */
async function createSignatureStore(): Promise<SignatureStore> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[nda] store: in-memory (DATABASE_URL assente → effimero)");
    return createInMemorySignatureStore();
  }
  try {
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: url });
    const { ensureSchema, createPostgresSignatureStore } = await import(
      "./nda/pgStore"
    );
    await ensureSchema(pool);
    console.log("[nda] store: Postgres (durevole)");
    return createPostgresSignatureStore(pool);
  } catch (err) {
    console.error(
      "[nda] store: init Postgres fallita → fallback in-memory:",
      err instanceof Error ? err.message : err
    );
    return createInMemorySignatureStore();
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Dietro l'edge proxy Railway (1 hop): con `trust proxy: 1` `req.ip` è l'IP
  // reale del client e NON è spoofabile (il primo elemento di X-Forwarded-For,
  // controllabile dal client, viene ignorato). Se la topologia avesse più hop,
  // adeguare questo numero.
  app.set("trust proxy", 1);

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Health check per Railway (e qualsiasi altro monitor esterno).
  app.get("/healthz", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  // API NDA (#26/#30): firma server-authoritative + PDF + log IP + email Resend.
  // Store anti-replay + idempotenza: Postgres durevole se `DATABASE_URL`, altrimenti
  // in-memory effimero (si azzera al redeploy).
  const signatureStore = await createSignatureStore();
  app.use("/api/nda", createNdaRouter({ store: signatureStore }));

  // Rotte API sconosciute → 404 JSON (NON la SPA): un client API che sbaglia
  // path deve ricevere un errore macchina-leggibile, non l'index.html con 200.
  // Deve stare PRIMA del catch-all che serve la SPA.
  app.use("/api", (_req, res) => {
    res.status(404).json({ ok: false, error: "not_found" });
  });

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  // Railway inietta PORT; bind esplicito su 0.0.0.0 per essere raggiungibile.
  const port = Number(process.env.PORT) || 3000;
  const host = "0.0.0.0";

  server.listen(port, host, () => {
    console.log(`Server running on http://${host}:${port}/`);
  });
}

startServer().catch(console.error);
