import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { createNdaRouter } from "./nda/router";
import { createInMemorySignatureStore } from "./nda/store";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Dietro il proxy Railway: fa sì che req.ip/X-Forwarded-For siano affidabili.
  app.set("trust proxy", true);

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

  // API NDA (PR2 #26): firma server-authoritative + PDF + log IP + email Resend.
  // Store anti-replay in-memory (Railway effimero: si azzera al redeploy).
  const signatureStore = createInMemorySignatureStore();
  app.use("/api/nda", createNdaRouter({ store: signatureStore }));

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
