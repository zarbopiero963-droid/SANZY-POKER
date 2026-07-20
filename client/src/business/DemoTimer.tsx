/**
 * Overlay del timer demo (15 minuti) mostrato sopra il tavolo 3D.
 *
 * Il countdown dipende SOLO da `startedAt` (fissato alla firma dell'NDA): al
 * refresh della pagina il tempo prosegue e non riparte. Quando arriva a zero
 * chiama `onExpire`. Il componente è un overlay React (non tocca Babylon).
 */
import { useEffect, useRef, useState } from "react";
import {
  computeRemainingMs,
  DEMO_DURATION_MS,
  formatCountdown,
  isTimerAnnounceTick,
  timerPhase,
} from "./demoSession";
import { tb, type BizLocale } from "./landingI18n";

type DemoTimerProps = {
  startedAt: number;
  locale: BizLocale;
  onExpire: () => void;
  totalMs?: number;
};

export default function DemoTimer({
  startedAt,
  locale,
  onExpire,
  totalMs = DEMO_DURATION_MS,
}: DemoTimerProps) {
  const [remaining, setRemaining] = useState(() =>
    computeRemainingMs(startedAt, Date.now(), totalMs)
  );
  // Evita di richiamare onExpire più di una volta.
  const firedRef = useRef(false);
  // Chiave della sessione: firedRef si azzera SOLO quando cambia davvero, non a
  // ogni setup dell'effect. Così il doppio setup/cleanup/setup di React Strict
  // Mode al mount non fa scattare onExpire due volte per la stessa scadenza.
  const sessionKeyRef = useRef<string>("");
  // onExpire in un ref: l'effect NON dipende dalla sua identità.
  const onExpireRef = useRef(onExpire);
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const key = `${startedAt}:${totalMs}`;
    if (sessionKeyRef.current !== key) {
      sessionKeyRef.current = key;
      firedRef.current = false; // nuova sessione reale: riabilita onExpire
    }
    const tick = () => {
      const ms = computeRemainingMs(startedAt, Date.now(), totalMs);
      setRemaining(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpireRef.current();
      }
    };
    tick(); // aggiorna subito al mount (es. dopo un refresh)
    const id = window.setInterval(tick, 1000);
    // Solo al RITORNO sul tab (non quando va in background) ricalcoliamo subito:
    // il valore dipende da startedAt, quindi resta esatto anche col throttling.
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [startedAt, totalMs]);

  // Fase visiva (idea #12): calma (bianco/verde) → ambra (ultimi 5') → rosso
  // lampeggiante (ultimo minuto). L'urgenza sale con l'avvicinarsi della scadenza.
  const phase = timerPhase(remaining);
  // Annuncio screen-reader solo a soglie (5', 60/30/15/10/5/3/2/1/0 s): evita di
  // intasare la live region ogni secondo mentre l'utente agisce sul tavolo.
  const announce = isTimerAnnounceTick(remaining);
  const formatted = formatCountdown(remaining);
  const label = tb("timer.label", locale);

  return (
    <div
      className="sanzy-demo-timer"
      role="timer"
      aria-label={`${label} ${formatted}`}
      data-phase={phase}
    >
      <span className="sanzy-demo-timer__label">{label}</span>
      <span className="sanzy-demo-timer__value">{formatted}</span>
      {/* Region live STABILE (sempre presente): gli screen reader annunciano solo
          quando il testo cambia. Restando vuota fuori dall'ultimo minuto evita
          gli annunci al secondo; nell'ultimo minuto annuncia il tempo residuo.
          Un toggle di aria-live sullo stesso nodo è invece inaffidabile. */}
      <span
        className="sanzy-demo-timer__sr"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announce ? `${label} ${formatted}` : ""}
      </span>
      <style>{TIMER_CSS}</style>
    </div>
  );
}

const TIMER_CSS = `
.sanzy-demo-timer {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 40;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  padding: 8px 14px;
  border-radius: 12px;
  background: rgba(6, 32, 22, 0.82);
  border: 1px solid rgba(214, 178, 102, 0.45);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  color: #f4efe4;
  font-family: "Manrope", system-ui, sans-serif;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: none;
}
.sanzy-demo-timer__label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #d6b466;
}
.sanzy-demo-timer__value {
  font-size: 22px;
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}
.sanzy-demo-timer__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}
.sanzy-demo-timer[data-phase="warn"] {
  border-color: rgba(230, 168, 60, 0.85);
}
.sanzy-demo-timer[data-phase="warn"] .sanzy-demo-timer__value {
  color: #f2b23c;
}
.sanzy-demo-timer[data-phase="urgent"] {
  border-color: rgba(216, 52, 44, 0.9);
}
.sanzy-demo-timer[data-phase="urgent"] .sanzy-demo-timer__value {
  color: #ff5a4f;
  animation: sanzy-timer-pulse 1s ease-in-out infinite;
}
@keyframes sanzy-timer-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.35; }
}
@media (prefers-reduced-motion: reduce) {
  .sanzy-demo-timer[data-phase="urgent"] .sanzy-demo-timer__value {
    animation: none;
  }
}
`;
