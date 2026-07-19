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
  withAlphaByte,
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

  it("dotPulseAlpha(pulse, index): equivale alla formula storica, in [0.38, 1], cala con l'indice", () => {
    // Con pulse = pulse01(elapsed) deve coincidere con 0.7 + sin(elapsed*3.4)*0.3 - i*0.025.
    for (let s = 0; s < 500; s += 1) {
      const elapsed = s * 0.031;
      const pulse = pulse01(elapsed);
      const legacy = 0.7 + Math.sin(elapsed * 3.4) * 0.3;
      for (let i = 0; i < 4; i += 1) {
        const expected = Math.max(0.38, legacy - i * 0.025);
        expect(dotPulseAlpha(pulse, i)).toBeCloseTo(expected, 10);
      }
    }
    // Intervallo e monotonia rispetto all'indice a pulse fisso.
    for (let p = 0; p <= 100; p += 1) {
      const pulse = p / 100;
      const a0 = dotPulseAlpha(pulse, 0);
      const a1 = dotPulseAlpha(pulse, 1);
      expect(a0).toBeGreaterThanOrEqual(0.38);
      expect(a0).toBeLessThanOrEqual(1);
      expect(a1).toBeLessThanOrEqual(a0);
    }
    // Il floor 0.38 scatta al minimo (pulse=0): grezzo per indice 3 = 0.325 < 0.38.
    expect(dotPulseAlpha(0, 3)).toBeCloseTo(0.38, 10);
    // Clamp dell'input: un pulse fuori [0,1] (es. elapsed grezzo) non satura.
    expect(dotPulseAlpha(5, 0)).toBeCloseTo(1, 10); // clamp a 1 → 0.4+0.6 = 1
    expect(dotPulseAlpha(-5, 0)).toBeCloseTo(0.4, 10); // clamp a 0 → 0.4 (indice 0)
    expect(dotPulseAlpha(-5, 3)).toBeCloseTo(0.38, 10); // clamp a 0 → floor a indice alto
    expect(dotPulseAlpha(1000, 0)).toBeLessThanOrEqual(1);
  });

  it("dots: alpha applicato è funzione pura del byte quantizzato (coerenza chiave↔valore)", () => {
    // In tick la chiave è round(pulse01(e)*255) e il valore dotPulseAlpha(byte/255, i):
    // due elapsed con lo STESSO byte devono produrre lo stesso alpha applicato.
    const applied = (elapsed: number, index: number) =>
      dotPulseAlpha(Math.round(pulse01(elapsed) * 255) / 255, index);
    const seen = new Map<string, number>();
    for (let s = 0; s < 3000; s += 1) {
      const elapsed = s * 0.011;
      const byte = Math.round(pulse01(elapsed) * 255);
      for (let i = 0; i < 4; i += 1) {
        const key = `${byte}:${i}`;
        const value = applied(elapsed, i);
        if (seen.has(key)) expect(value).toBe(seen.get(key));
        else seen.set(key, value);
      }
    }
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

  it("withAlphaByte: applica un byte, clamp/robustezza, e coerenza con withPulseAlpha", () => {
    expect(withAlphaByte("#F49A35", 198)).toBe("#F49A35c6");
    expect(withAlphaByte("#F49A35", 0)).toBe("#F49A3500");
    expect(withAlphaByte("#F49A35", 255)).toBe("#F49A35ff");
    // Clamp e guard: fuori range o non finiti non producono suffissi invalidi.
    expect(withAlphaByte("#F49A35", 999)).toBe("#F49A35ff");
    expect(withAlphaByte("#F49A35", -5)).toBe("#F49A3500");
    expect(withAlphaByte("#F49A35", NaN)).toBe("#F49A3500");
    expect(withAlphaByte("#F49A35ff", 198)).toBe("#F49A35c6"); // usa i primi 7
    // Coerenza CHIAVE↔VALORE: la stringa costruita dal byte di cache coincide
    // con withPulseAlpha per lo stesso elapsed (blinda l'ottimizzazione in tick).
    for (let i = 0; i < 1000; i += 1) {
      const elapsed = i * 0.023;
      expect(withAlphaByte("#F49A35", activeBorderAlphaByte(elapsed))).toBe(
        withPulseAlpha("#F49A35", elapsed)
      );
    }
  });
});
