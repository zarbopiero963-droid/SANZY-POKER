/**
 * Helper puri di animazione dell'HUD (client/src/game/anim.ts).
 *
 * Guidano il pulsare del bordo del giocatore di turno nel loop `tick(elapsed)`.
 * Sono puri e deterministici: qui si verificano intervalli e casi limite così che
 * l'alpha resti sempre valido (byte esadecimale a 2 cifre, colore #RRGGBBAA).
 */
import { describe, expect, it } from "vitest";
import {
  activeBorderAlpha,
  activeBorderAlphaByte,
  alphaByteHex,
  dotPulseAlpha,
  pulse01,
  withPulseAlpha,
} from "../client/src/game/anim";

describe("anim — helper di pulsazione", () => {
  it("pulse01 resta in [0, 1] su un ampio campione e vale 0.5 a t=0", () => {
    expect(pulse01(0)).toBeCloseTo(0.5, 10);
    for (let i = 0; i < 2000; i += 1) {
      const v = pulse01(i * 0.017);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  });

  it("activeBorderAlpha resta in [0.55, 1] (il bordo non sparisce mai)", () => {
    for (let i = 0; i < 2000; i += 1) {
      const a = activeBorderAlpha(i * 0.017);
      expect(a).toBeGreaterThanOrEqual(0.55);
      expect(a).toBeLessThanOrEqual(1);
    }
  });

  it("activeBorderAlphaByte: intero in [140, 255], coerente con activeBorderAlpha", () => {
    for (let i = 0; i < 2000; i += 1) {
      const elapsed = i * 0.017;
      const b = activeBorderAlphaByte(elapsed);
      expect(Number.isInteger(b)).toBe(true);
      // activeBorderAlpha ∈ [0.55, 1] → *255 → round ∈ [140, 255].
      expect(b).toBeGreaterThanOrEqual(140);
      expect(b).toBeLessThanOrEqual(255);
      expect(b).toBe(Math.round(activeBorderAlpha(elapsed) * 255));
    }
  });

  it("alphaByteHex: 2 cifre, clamp e valori noti", () => {
    expect(alphaByteHex(0)).toBe("00");
    expect(alphaByteHex(1)).toBe("ff");
    expect(alphaByteHex(0.5)).toBe("80");
    expect(alphaByteHex(-3)).toBe("00"); // clamp sotto
    expect(alphaByteHex(9)).toBe("ff"); // clamp sopra
    // Guard su NaN: mai "NaN" nel colore. Gli infiniti li gestisce il clamp.
    expect(alphaByteHex(NaN)).toBe("00");
    expect(alphaByteHex(Infinity)).toBe("ff");
    expect(alphaByteHex(-Infinity)).toBe("00");
    // Sempre esattamente 2 caratteri, anche per valori piccoli.
    for (let i = 0; i <= 100; i += 1) {
      expect(alphaByteHex(i / 100)).toHaveLength(2);
    }
  });

  it("dotPulseAlpha: equivale alla formula storica, in [0.38, 1], cala con l'indice", () => {
    // Deve coincidere con la vecchia formula 0.7 + sin(elapsed*3.4)*0.3 - i*0.025.
    for (let s = 0; s < 500; s += 1) {
      const elapsed = s * 0.031;
      const legacy = 0.7 + Math.sin(elapsed * 3.4) * 0.3;
      for (let i = 0; i < 4; i += 1) {
        const expected = Math.max(0.38, legacy - i * 0.025);
        expect(dotPulseAlpha(elapsed, i)).toBeCloseTo(expected, 10);
      }
    }
    // Intervallo e monotonia rispetto all'indice a t fisso.
    for (let s = 0; s < 200; s += 1) {
      const elapsed = s * 0.05;
      const a0 = dotPulseAlpha(elapsed, 0);
      const a1 = dotPulseAlpha(elapsed, 1);
      expect(a0).toBeGreaterThanOrEqual(0.38);
      expect(a0).toBeLessThanOrEqual(1);
      expect(a1).toBeLessThanOrEqual(a0);
    }
    // Il floor 0.38 scatta davvero: al minimo della sinusoide (sin=-1) la
    // formula grezza per indice 3 vale 0.325 < 0.38 → deve essere clampata.
    const trough = (3 * Math.PI) / 2 / 3.4; // sin(3.4 * trough) = -1
    expect(dotPulseAlpha(trough, 3)).toBeCloseTo(0.38, 10);
  });

  it("withPulseAlpha produce #RRGGBBAA valido e usa solo i primi 7 char del colore", () => {
    const c = withPulseAlpha("#F49A35", 0);
    expect(c).toMatch(/^#[0-9a-fA-F]{8}$/);
    expect(c.slice(0, 7)).toBe("#F49A35");
    // A t=0 l'alpha è activeBorderAlpha(0)=0.775 → 0xc6.
    expect(c).toBe("#F49A35c6");
    // Robusto se il colore arrivasse già con un byte alpha (usa i primi 7).
    expect(withPulseAlpha("#F49A35ff", 0)).toBe("#F49A35c6");
  });
});
