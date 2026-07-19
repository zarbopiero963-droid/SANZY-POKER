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
 * Alpha (frazione [0.55, 1]) del bordo attivo: pulsa senza mai sparire del
 * tutto, così il posto di turno "respira" restando sempre leggibile.
 */
export function activeBorderAlpha(elapsed: number): number {
  return 0.55 + pulse01(elapsed) * 0.45;
}

/** Converte una frazione [0, 1] nel byte alpha esadecimale a 2 cifre ("00".."ff"). */
export function alphaByteHex(fraction: number): string {
  const clamped = Math.max(0, Math.min(1, fraction));
  return Math.round(clamped * 255)
    .toString(16)
    .padStart(2, "0");
}

/**
 * Colore `#RRGGBB` + alpha pulsante → `#RRGGBBAA` (accettato da Babylon GUI).
 * Robusto se il colore arrivasse già con un byte alpha: usa solo i primi 7 char.
 */
export function withPulseAlpha(hexRRGGBB: string, elapsed: number): string {
  const base = hexRRGGBB.slice(0, 7);
  return base + alphaByteHex(activeBorderAlpha(elapsed));
}
