/**
 * AI code review per Sanzy Poker — script condiviso dai due workflow
 * (Anthropic Fable 5 e OpenAI). Legge la diff della PR, chiede una review al
 * modello indicato e la pubblica come commento sulla PR.
 *
 * Principi:
 *  - Poco credito: rivede SOLO la diff dei file cambiati (già filtrata dal
 *    workflow), con un tetto di dimensione in input; una review per esecuzione;
 *    i run vecchi vengono annullati (concurrency) a ogni nuovo commit.
 *  - Niente troncamento della review: tetto ampio di token in output e, se il
 *    testo supera il limite di GitHub, viene diviso in più commenti.
 *  - Il merge resta MANUALE: la review è un commento, non un check bloccante.
 *
 * Env richieste:
 *  PROVIDER            "anthropic" | "openai"
 *  MODEL               id del modello (da Variable del repo)
 *  ANTHROPIC_API_KEY / OPENAI_API_KEY   chiave (da Secret del repo)
 *  GITHUB_TOKEN        token del workflow (per commentare)
 *  GITHUB_REPOSITORY   "owner/repo"
 *  PR_NUMBER           numero PR
 *  HEAD_SHA            sha del commit in review
 *  REVIEWER_NAME       etichetta mostrata nel commento
 *  DIFF_FILE           percorso del file con la diff
 */

import { readFileSync } from "node:fs";

const {
  PROVIDER,
  MODEL,
  ANTHROPIC_API_KEY,
  OPENAI_API_KEY,
  GITHUB_TOKEN,
  GITHUB_REPOSITORY,
  PR_NUMBER,
  HEAD_SHA,
  REVIEWER_NAME = "AI Review",
  DIFF_FILE,
} = process.env;

const MAX_DIFF_CHARS = 60000; // tetto input per contenere il costo
const MAX_OUTPUT_TOKENS = 8000; // ampio: evita il troncamento della review
const GH_COMMENT_LIMIT = 60000; // limite pratico per commento GitHub

function fail(message) {
  console.error(message);
  process.exit(0); // non bloccare la CI: la review è informativa
}

const apiKey = PROVIDER === "anthropic" ? ANTHROPIC_API_KEY : OPENAI_API_KEY;
if (!apiKey) {
  fail(
    `[${REVIEWER_NAME}] Chiave API non configurata (Secret mancante). ` +
      `Salta la review. Configura il Secret e rilancia la label.`
  );
}

let diff = "";
try {
  diff = readFileSync(DIFF_FILE, "utf8");
} catch {
  fail(`[${REVIEWER_NAME}] Diff non leggibile (${DIFF_FILE}).`);
}
diff = diff.trim();
if (!diff) fail(`[${REVIEWER_NAME}] Diff vuota: niente da rivedere.`);

let diffNote = "";
if (diff.length > MAX_DIFF_CHARS) {
  diffNote =
    `\n\n> ⚠️ Diff troncata a ${MAX_DIFF_CHARS} caratteri per contenere il ` +
    `costo: rivisti i primi file. Per una review completa dividere la PR.`;
  diff = diff.slice(0, MAX_DIFF_CHARS);
}

const SYSTEM = [
  "Sei un revisore di codice esperto per il repository Sanzy Poker Pro",
  "(poker a due piatti, React + Vite + TypeScript, rendering Babylon.js).",
  "Rivedi SOLO la diff fornita. Rispondi in italiano, in modo conciso ma COMPLETO",
  "(non troncare). Concentrati su bug reali, regressioni e rischi.",
  "Invarianti sacri da proteggere: conservazione dei gettoni e regola di",
  "divisione 50/50 per piatto; gerarchia delle combinazioni §5; mazzo di 32",
  "carte; sequenza delle fasi; le due varianti Standard/Hi-Low; ogni testo",
  "mostrato deve passare da t() dell'i18n ed esistere in IT/EN/ES/FR.",
  "Struttura la review: (1) Sintesi; (2) Problemi per gravità con file:riga;",
  "(3) Suggerimenti; (4) Verdetto finale: 'OK per merge' oppure 'Richiede",
  "modifiche' con motivo. Non inventare righe non presenti nella diff.",
].join(" ");

const USER = `Rivedi la seguente diff della PR #${PR_NUMBER} (commit ${HEAD_SHA}).${diffNote}\n\n\`\`\`diff\n${diff}\n\`\`\``;

async function reviewAnthropic() {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM,
      messages: [{ role: "user", content: USER }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const text = (data.content || [])
    .filter(b => b.type === "text")
    .map(b => b.text)
    .join("")
    .trim();
  const truncated = data.stop_reason === "max_tokens";
  return { text, truncated };
}

async function reviewOpenAI() {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: USER },
      ],
      max_completion_tokens: MAX_OUTPUT_TOKENS,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const choice = (data.choices || [])[0] || {};
  const text = (choice.message?.content || "").trim();
  const truncated = choice.finish_reason === "length";
  return { text, truncated };
}

function splitForGitHub(body) {
  if (body.length <= GH_COMMENT_LIMIT) return [body];
  const parts = [];
  const lines = body.split("\n");
  let cur = "";
  for (const line of lines) {
    if ((cur + line + "\n").length > GH_COMMENT_LIMIT) {
      parts.push(cur);
      cur = "";
    }
    cur += line + "\n";
  }
  if (cur.trim()) parts.push(cur);
  return parts;
}

async function postComment(body) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${PR_NUMBER}/comments`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${GITHUB_TOKEN}`,
        accept: "application/vnd.github+json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ body }),
    }
  );
  if (!res.ok)
    throw new Error(`GitHub comment ${res.status}: ${await res.text()}`);
}

try {
  const { text, truncated } =
    PROVIDER === "anthropic" ? await reviewAnthropic() : await reviewOpenAI();
  if (!text) fail(`[${REVIEWER_NAME}] Il modello non ha restituito testo.`);
  const header =
    `### 🤖 AI Review — ${REVIEWER_NAME}\n` +
    `Modello: \`${MODEL}\` · Commit: \`${(HEAD_SHA || "").slice(0, 7)}\`\n\n`;
  const footer = truncated
    ? "\n\n> ⚠️ La risposta del modello è stata troncata dal limite di token; " +
      "aumentare `MAX_OUTPUT_TOKENS` se necessario."
    : "";
  const full = header + text + footer;
  const parts = splitForGitHub(full);
  for (let i = 0; i < parts.length; i += 1) {
    const suffix =
      parts.length > 1 ? `\n\n_(parte ${i + 1}/${parts.length})_` : "";
    // La prima parte include già l'header; le successive lo ripetono breve.
    const body = i === 0 ? parts[i] + suffix : `${header}${parts[i]}${suffix}`;
    await postComment(body);
  }
  console.log(
    `[${REVIEWER_NAME}] Review pubblicata (${parts.length} commento/i).`
  );
} catch (err) {
  fail(`[${REVIEWER_NAME}] Errore durante la review: ${err.message}`);
}
