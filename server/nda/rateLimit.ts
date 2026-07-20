/**
 * Rate limiter in-memory per l'endpoint NDA (PR2, tracking #26).
 *
 * `POST /api/nda/sign` è pubblico e costoso (genera un PDF e può inviare
 * un'email via Resend): senza limiti, richieste con email sempre diverse
 * potrebbero saturare la quota Resend, riempire la casella dell'owner e
 * caricare CPU/memoria. Questo limiter fissa un tetto per chiave (IP) su una
 * finestra scorrevole. Puro e testabile (`now` iniettabile).
 *
 * LIMITE DICHIARATO: è in-memory (coerente con lo store anti-replay) → per
 * processo, si azzera al redeploy Railway. È un deterrente anti-abuso di base.
 */
export interface RateLimiter {
  /** True se la richiesta è ammessa (e viene contata); false se supera il tetto. */
  check(key: string, now: number): boolean;
}

export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    check(key, now) {
      const recent = (hits.get(key) ?? []).filter(t => now - t < opts.windowMs);
      if (recent.length >= opts.max) {
        hits.set(key, recent); // aggiorna la finestra (scarta i vecchi)
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}
