import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createNdaRouter } from "./nda/router";
import { createInMemorySignatureStore, type SignatureStore } from "./nda/store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Sceglie lo store delle firme:
 *  - `DATABASE_URL` ASSENTE → **in-memory** effimero (dev/CI, o produzione non
 *    ancora provisionata — fallback INTENZIONALE, come l'email senza `RESEND_API_KEY`).
 *  - `DATABASE_URL` PRESENTE → **Postgres durevole**. Se l'init fallisce NON si
 *    degrada in silenzio (nasconderebbe una config rotta e ripristinerebbe
 *    l'anti-replay effimero: un redeploy riconcederebbe la stessa email): si
 *    propaga l'errore → lo startup fallisce in modo RUMOROSO (readiness KO).
 * `pg` è importato dinamicamente così non è richiesto a runtime quando non serve.
 */
async function createSignatureStore(): Promise<SignatureStore> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.log("[nda] store: in-memory (DATABASE_URL assente → effimero)");
    return createInMemorySignatureStore();
  }
  const { Pool } = await import("pg");
  const pool = new Pool({ connectionString: url });
  // Un errore su una connessione IDLE del pool emette 'error': senza handler
  // sarebbe un uncaught exception → crash del processo. Lo logghiamo (senza la
  // connection string, che contiene credenziali) e lasciamo che il pool si
  // riprenda ricreando le connessioni.
  pool.on("error", err => {
    console.error("[nda] pool Postgres error (idle):", err.message);
  });
  const { ensureSchema, createPostgresSignatureStore, pruneExpired } =
    await import("./nda/pgStore");
  // Retry con backoff: un'indisponibilità TRANSITORIA del DB all'avvio (deploy
  // concorrente, restart del DB su Railway) non deve crashare al primo colpo.
  // Dopo N tentativi falliti si propaga l'errore → lo startup fallisce (meglio
  // che degradare muti su una config davvero rotta).
  const maxAttempts = 5;
  for (let attempt = 1; ; attempt++) {
    try {
      await ensureSchema(pool);
      break;
    } catch (err) {
      if (attempt >= maxAttempts) throw err;
      const backoffMs = Math.min(1000 * 2 ** (attempt - 1), 10000);
      console.error(
        `[nda] init Postgres tentativo ${attempt}/${maxAttempts} fallito, retry tra ${backoffMs}ms:`,
        err instanceof Error ? err.message : err
      );
      await new Promise(r => setTimeout(r, backoffMs));
    }
  }
  // Cleanup di retention SCHEDULATO: il prune opportunistico in `reserve` non
  // scatta se non arrivano firme, così una `password` at-rest potrebbe restare
  // oltre la finestra con traffico nullo. Un timer best-effort (unref: non
  // tiene vivo il processo) pota comunque a intervalli regolari. Un prime
  // iniziale al boot pota subito ciò che si è accumulato mentre era spento.
  const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000; // ogni 6 ore
  void pruneExpired(pool);
  const cleanupTimer = setInterval(() => {
    void pruneExpired(pool);
  }, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref?.();
  console.log("[nda] store: Postgres (durevole)");
  return createPostgresSignatureStore(pool);
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

startServer().catch(err => {
  // Avvio fallito (es. `DATABASE_URL` configurata ma DB irraggiungibile): esci
  // con codice non-zero così Railway/CI segnalano la readiness KO in modo
  // evidente, invece di restare su in modo apparentemente sano.
  console.error("[nda] avvio server fallito:", err);
  process.exit(1);
});
