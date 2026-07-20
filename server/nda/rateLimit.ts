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
  /** Elimina le entry scadute (chiamato periodicamente da `check`). Per i test. */
  sweep(now: number): void;
  /** Numero di chiavi tracciate (per i test/diagnostica). */
  size(): number;
}

export function createRateLimiter(opts: {
  max: number;
  windowMs: number;
  /** Ogni quante `check` scatta lo sweep periodico (default 500). */
  sweepEvery?: number;
}): RateLimiter {
  const hits = new Map<string, number[]>();
  const sweepEvery = opts.sweepEvery ?? 500;
  let sinceSweep = 0;

  // Sweep periodico: senza, gli IP visti una sola volta resterebbero nella Map
  // per tutta la vita del processo (crescita illimitata su endpoint pubblico).
  function sweep(now: number) {
    // forEach (non for-of) per evitare la dipendenza da downlevelIteration; è
    // sicuro cancellare dalla Map durante l'iterazione.
    hits.forEach((times, key) => {
      const recent = times.filter(t => now - t < opts.windowMs);
      if (recent.length === 0) hits.delete(key);
      else hits.set(key, recent);
    });
  }

  return {
    check(key, now) {
      if (++sinceSweep >= sweepEvery) {
        sinceSweep = 0;
        sweep(now);
      }
      const recent = (hits.get(key) ?? []).filter(t => now - t < opts.windowMs);
      if (recent.length >= opts.max) {
        hits.set(key, recent); // aggiorna la finestra (scarta i vecchi)
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
    sweep,
    size: () => hits.size,
  };
}
