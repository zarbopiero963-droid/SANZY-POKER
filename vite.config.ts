import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";
import obfuscator from "vite-plugin-javascript-obfuscator";

// =============================================================================
// Offuscamento del bundle di produzione
// -----------------------------------------------------------------------------
// Obiettivo: rendere ILLEGGIBILE il JavaScript del gioco servito ai browser
// (mazzo, regole, confronti, bot, scena) — mangling degli identificatori,
// string array cifrato, control-flow flattening moderato, dead-code injection
// leggero. Applicato SOLO al nostro codice: `exclude: [/node_modules/]` lascia
// intatti Babylon.js e React (offuscarli gonfierebbe il bundle e rallenterebbe
// il render loop). Il plugin gira con `enforce: "post"`, quindi opera sul JS già
// compilato da esbuild/React, non sul TSX sorgente.
//
// LIMITE ONESTO: il codice client viene comunque scaricato da ogni visitatore.
// L'offuscamento alza molto il muro (copia/lettura molto difficili) ma NON rende
// la meccanica invisibile al 100%. L'unico modo per nasconderla davvero è
// spostarla lato server (tracciato in #30, punto 2 «sessione server-authoritative»).
//
// Profilo volutamente MODERATO su control-flow/dead-code: soglie troppo alte
// gonfiano il bundle e possono rallentare il `tick()` per-frame della scena.
// Alzabili in futuro se serve più resistenza (a costo di dimensione/CPU).
// `sourcemap: false` è essenziale: una sourcemap pubblicata annullerebbe
// completamente l'offuscamento.
const obfuscatorOptions = {
  compact: true,
  identifierNamesGenerator: "hexadecimal" as const,
  numbersToExpressions: true,
  simplify: true,
  stringArray: true,
  stringArrayEncoding: ["base64" as const],
  stringArrayThreshold: 0.75,
  stringArrayRotate: true,
  stringArrayShuffle: true,
  splitStrings: true,
  splitStringsChunkLength: 8,
  transformObjectKeys: true,
  controlFlowFlattening: true,
  controlFlowFlatteningThreshold: 0.5,
  deadCodeInjection: true,
  deadCodeInjectionThreshold: 0.2,
  unicodeEscapeSequence: false,
  // Off di proposito: `selfDefending`/`debugProtection` possono rompere l'app
  // o degradare le performance del gioco; vanno accesi solo con smoke-test reale.
  selfDefending: false,
  debugProtection: false,
  disableConsoleOutput: false,
};

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    obfuscator({
      apply: "build",
      exclude: [/node_modules/],
      options: obfuscatorOptions,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname),
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Nessuna sourcemap in produzione: pubblicarla vanificherebbe l'offuscamento.
    sourcemap: false,
  },
  server: {
    port: 3000,
    strictPort: false, // Will find next available port if 3000 is busy
    host: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
