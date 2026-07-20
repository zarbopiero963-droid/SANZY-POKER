/**
 * Home di Sanzy Poker.
 *
 * Flusso B2B (idea #12, tracking #26): la vetrina business è la porta d'ingresso.
 *
 *   Landing business → (Try Demo) → popup NDA 3 slide → sblocco/password →
 *   StartScreen (lingua → variante) → GameCanvas (+ overlay timer 15').
 *
 * Il gate NDA e il timer sono persistiti (`localStorage`): al refresh la demo
 * PROSEGUE (il timer non riparte) finché non scade. Il gioco vero e proprio non
 * è toccato: qui si sceglie solo quando montarlo.
 */
import { useCallback, useEffect, useState } from "react";
import GameCanvas from "@/components/GameCanvas";
import StartScreen from "@/components/StartScreen";
import type { Variant } from "@/game/rules";
import BusinessLanding from "@/business/BusinessLanding";
import NdaDialog from "@/business/NdaDialog";
import DemoTimer from "@/business/DemoTimer";
import DemoExpired from "@/business/DemoExpired";
import {
  clearDemoSession,
  isExpired,
  loadDemoSession,
  saveDemoSession,
  type DemoSession,
} from "@/business/demoSession";
import {
  BIZ_LOCALES,
  DEFAULT_BIZ_LOCALE,
  type BizLocale,
} from "@/business/landingI18n";

// Nota: dopo la firma lo stage resta "entry"; il passaggio al gioco è governato
// dallo stato `variant` (scelto in StartScreen), non da uno stage dedicato.
type Stage = "landing" | "nda" | "entry" | "expired";

const BIZ_LOCALE_KEY = "sanzy.business.locale";

function readBizLocale(): BizLocale {
  try {
    const stored = localStorage.getItem(BIZ_LOCALE_KEY);
    if (stored && (BIZ_LOCALES as string[]).includes(stored))
      return stored as BizLocale;
  } catch {
    // storage off: default IT
  }
  return DEFAULT_BIZ_LOCALE;
}

export default function Home() {
  const [bizLocale, setBizLocale] = useState<BizLocale>(readBizLocale);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [variant, setVariant] = useState<Variant | null>(null);
  const [stage, setStage] = useState<Stage>("landing");

  // Al mount: se esiste una sessione firmata e NON scaduta, saltiamo il gate e
  // andiamo alla scelta lingua/variante (il timer riprende da `startedAt`). Se
  // scaduta, mostriamo la schermata di scadenza.
  useEffect(() => {
    const saved = loadDemoSession();
    if (!saved) return;
    if (isExpired(saved.startedAt, Date.now())) {
      // Coerente con onExpire: la sessione scaduta viene rimossa dallo storage.
      clearDemoSession();
      setStage("expired");
      return;
    }
    setSession(saved);
    setStage("entry");
  }, []);

  const toggleLocale = useCallback(() => {
    setBizLocale(prev => {
      const next: BizLocale = prev === "it" ? "en" : "it";
      try {
        localStorage.setItem(BIZ_LOCALE_KEY, next);
      } catch {
        // no-op
      }
      return next;
    });
  }, []);

  const onSigned = useCallback((signed: DemoSession) => {
    saveDemoSession(signed);
    setSession(signed);
    setStage("entry");
  }, []);

  const onExpire = useCallback(() => {
    clearDemoSession();
    setSession(null);
    setVariant(null);
    setStage("expired");
  }, []);

  const backHome = useCallback(() => {
    setStage("landing");
  }, []);

  // --- Rendering per stage ---

  if (stage === "expired") {
    return <DemoExpired locale={bizLocale} onBackHome={backHome} />;
  }

  if (stage === "landing") {
    return (
      <BusinessLanding
        locale={bizLocale}
        onToggleLocale={toggleLocale}
        onTryDemo={() => setStage("nda")}
      />
    );
  }

  if (stage === "nda") {
    return (
      <NdaDialog
        locale={bizLocale}
        onClose={() => setStage("landing")}
        onSigned={onSigned}
      />
    );
  }

  // Da qui in poi la demo è firmata: il timer è sempre attivo come overlay.
  const timer = session ? (
    <DemoTimer
      startedAt={session.startedAt}
      locale={bizLocale}
      onExpire={onExpire}
    />
  ) : null;

  if (!variant) {
    return (
      <>
        <StartScreen onStart={({ variant: chosen }) => setVariant(chosen)} />
        {timer}
      </>
    );
  }

  return (
    <>
      <GameCanvas variant={variant} />
      {timer}
    </>
  );
}
