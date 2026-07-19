/**
 * Firma dello stato VISIBILE dell'HUD, estratta in un modulo puro (nessun import
 * Babylon) così da poterla testare offline con Vitest.
 *
 * Strategia COMPLETA per costruzione: si serializza l'intero `TableState` (più i
 * campi UI locali: schermo, lingua, layout) escludendo SOLO i campi che non
 * influenzano il rendering visivo. Così l'errore possibile diventa "un rebuild in
 * più" (innocuo), mai "HUD stantio" (bug): non serve ricordarsi di aggiungere ogni
 * nuovo campo di stato alla firma.
 *
 * Esclusi di proposito:
 * - `eventSerial`/`lastEvent`: guidano solo i cue audio in render(), non il
 *   rendering visivo (includerli farebbe un rebuild a ogni evento → slider
 *   ricreato durante il turno umano).
 * - `log` raw: sostituito da lunghezza + sola parte visibile (l'HUD mostra
 *   `slice(0, VISIBLE_LOG_LINES)`), per non far crescere la firma con lo storico.
 *
 * Nota: nessun campo di `TableState` cambia durante il turno umano (non ci sono
 * timer/countdown nello stato), quindi la firma resta stabile e lo slider di
 * rilancio non viene ricreato. `JSON.stringify` struttura tutto senza separatori
 * manuali → nessuna collisione tra testi liberi (lastAction, log, id) e delimitatori.
 */
import type { TableState } from "./state";
import { getLocale } from "./i18n";

/** Righe di log mostrate dall'HUD: condivise tra il render e la firma. */
export const VISIBLE_LOG_LINES = 7;

export type ViewScreen = "lobby" | "table";

/** Stato UI locale (non presente in `TableState`) che influenza il rendering. */
export type ViewUiState = {
  screen: ViewScreen;
  mobile: boolean;
  mobileHeight: number;
};

export function computeViewSignature(
  table: TableState,
  ui: ViewUiState
): string {
  const head = {
    screen: ui.screen,
    // Lingua attiva: se cambia a runtime, tutti i testi t() vanno ridisegnati.
    locale: getLocale(),
    mobile: ui.mobile,
    mobileHeight: ui.mobileHeight,
  };
  // Rami non-"table" (lobby): bastano schermo + lingua + layout.
  if (ui.screen !== "table") return JSON.stringify(head);
  // Esclusione SOLO al livello top di TableState, via destrutturazione: i campi
  // audio (eventSerial/lastEvent) e il log raw sono tolti qui, non con un
  // replacer di JSON.stringify — che agirebbe a QUALSIASI profondità e potrebbe
  // un domani escludere per sbaglio un campo omonimo annidato (es. in un player)
  // reintroducendo il rischio di "HUD stantio" che questo modulo vuole azzerare.
  // Vincolo di tipo: TableState deve restare JSON-serializzabile (solo POJO,
  // array e primitivi) — nessun Map/Set/undefined/funzione, altrimenti la firma
  // li ometterebbe silenziosamente. Un test di round-trip lo verifica.
  const { eventSerial, lastEvent, log, ...visible } = table;
  return JSON.stringify({
    ...head,
    table: visible,
    logLength: log.length,
    logHead: log.slice(0, VISIBLE_LOG_LINES),
  });
}
