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

  useEffect(() => {
    // Se startedAt/totalMs cambiano (nuova sessione), riabilita onExpire.
    firedRef.current = false;
    const tick = () => {
      const ms = computeRemainingMs(startedAt, Date.now(), totalMs);
      setRemaining(ms);
      if (ms <= 0 && !firedRef.current) {
        firedRef.current = true;
        onExpire();
      }
    };
    tick(); // aggiorna subito al mount (es. dopo un refresh)
    const id = window.setInterval(tick, 1000);
    // Al ritorno sul tab (i timer in background vengono rallentati dal browser)
    // ricalcoliamo subito: il valore dipende da startedAt, quindi resta esatto.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [startedAt, totalMs, onExpire]);

  const isLow = remaining <= 60_000; // ultimo minuto: evidenzia

  return (
    <div
      className="sanzy-demo-timer"
      role="timer"
      aria-live="off"
      aria-label={tb("timer.label", locale)}
      data-low={isLow ? "true" : "false"}
    >
      <span className="sanzy-demo-timer__label">
        {tb("timer.label", locale)}
      </span>
      <span className="sanzy-demo-timer__value">
        {formatCountdown(remaining)}
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
.sanzy-demo-timer[data-low="true"] {
  border-color: rgba(216, 52, 44, 0.8);
}
.sanzy-demo-timer[data-low="true"] .sanzy-demo-timer__value {
  color: #ff6a5f;
}
`;
