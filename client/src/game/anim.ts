/**
 * Helper di animazione PURI (nessun import Babylon) per l'HUD, così da poterli
 * testare offline con Vitest. Servono al pulsare del bordo del giocatore di
 * turno: l'animazione gira nel loop `tick(elapsed)` (per-frame), MAI tramite un
 * rebuild dell'HUD — altrimenti si riattiverebbe il render-gate a ogni frame e
 * lo slider di rilancio verrebbe ricreato (il bug risolto nella PR #19).
 */

/** Ampiezza di pulsazione normalizzata in [0, 1] a partire dal tempo trascorso. */
export function pulse01(elapsed: number, speed = 3.4): number {
  return 0.5 + Math.sin(elapsed * speed) * 0.5;
}

/**
 * Alpha del punto di stato `i`-esimo (i "pulseDots"): stessa matematica di
 * `pulse01` (unificata), sfalsata per indice e con un minimo di 0.38 così i
 * punti non spariscono. Equivale a `max(0.38, 0.7 + sin(elapsed*3.4)*0.3 - i*0.025)`
 * (il floor 0.38 fa parte dell'equivalenza).
 */
export function dotPulseAlpha(elapsed: number, index: number): number {
  return Math.max(0.38, 0.4 + pulse01(elapsed) * 0.6 - index * 0.025);
}

/**
 * Alpha (frazione [0.55, 1]) del bordo attivo: pulsa senza mai sparire del
 * tutto, così il posto di turno "respira" restando sempre leggibile.
 */
export function activeBorderAlpha(elapsed: number): number {
  return 0.55 + pulse01(elapsed) * 0.45;
}

/**
 * Byte alpha (0..255) del bordo attivo per il frame corrente. Usato come CHIAVE
 * di cache in tick(): confrontando l'intero si evita di costruire la stringa
 * colore quando il valore quantizzato non è cambiato (niente alloc per-frame).
 */
export function activeBorderAlphaByte(elapsed: number): number {
  return Math.round(activeBorderAlpha(elapsed) * 255);
}

/** Converte una frazione [0, 1] nel byte alpha esadecimale a 2 cifre ("00".."ff"). */
export function alphaByteHex(fraction: number): string {
  // Guard solo su NaN (che propagherebbe "NaN" nel colore): gli infiniti li
  // gestisce il clamp naturale (+∞ → 1 → "ff", -∞ → 0 → "00").
  const safe = Number.isNaN(fraction) ? 0 : fraction;
  const clamped = Math.max(0, Math.min(1, safe));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
}

/**
 * Applica un byte alpha (0..255) GIÀ calcolato a un colore `#RRGGBB` → `#RRGGBBAA`.
 * Usare questa quando il byte è già la chiave di cache: chiave (byte) e valore
 * (stringa) derivano così dalla stessa fonte, senza dipendenza implicita di
 * coerenza tra due formule separate. Robusto se il colore arriva già con alpha
 * (usa i primi 7 char) e su byte non finiti/fuori range (clamp a 0..255).
 */
export function withAlphaByte(hexRRGGBB: string, byte: number): string {
  const safe = Number.isFinite(byte)
    ? Math.max(0, Math.min(255, Math.round(byte)))
    : 0;
  return hexRRGGBB.slice(0, 7) + safe.toString(16).padStart(2, "0");
}

/**
 * Colore `#RRGGBB` + alpha pulsante del bordo attivo → `#RRGGBBAA`. Deriva dallo
 * STESSO byte di `activeBorderAlphaByte`, quindi resta coerente con la chiave di
 * cache usata in `tick()` per costruzione.
 */
export function withPulseAlpha(hexRRGGBB: string, elapsed: number): string {
  return withAlphaByte(hexRRGGBB, activeBorderAlphaByte(elapsed));
}
