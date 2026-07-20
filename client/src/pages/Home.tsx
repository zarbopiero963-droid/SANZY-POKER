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
  type PersistedSession,
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
  // Dopo la firma Home tiene solo il minimo (no PII): startedAt per il timer,
  // signatureId/password per riferimento. Il payload con la PII vive solo dentro
  // NdaDialog al momento della firma (e nel PR2 va al server), mai qui.
  const [session, setSession] = useState<PersistedSession | null>(null);
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

  // La persistenza è un effetto collaterale: sta in un useEffect, non nell'updater
  // di stato (React può invocare gli updater più volte, es. in Strict Mode).
  useEffect(() => {
    try {
      localStorage.setItem(BIZ_LOCALE_KEY, bizLocale);
    } catch {
      // no-op
    }
  }, [bizLocale]);

  const toggleLocale = useCallback(() => {
    setBizLocale(prev => (prev === "it" ? "en" : "it"));
  }, []);

  const onSigned = useCallback((signed: DemoSession) => {
    // Guardia sincrona: se tra la firma e il click su "Avvia" sono passati più
    // di 15' (utente fermo sulla schermata di sblocco), la sessione è già
    // scaduta → non montare il gioco, vai diretto alla scadenza. Così "a 0
    // blocca la demo" vale anche su questo percorso, senza il frame iniziale.
    if (isExpired(signed.startedAt, Date.now())) {
      clearDemoSession();
      setStage("expired");
      return;
    }
    saveDemoSession(signed); // persiste solo il minimo (scarta la PII)
    // In memoria a livello di Home teniamo solo il sottoinsieme senza PII.
    setSession({
      signatureId: signed.signatureId,
      password: signed.password,
      startedAt: signed.startedAt,
    });
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
    // La landing resta sotto il dialog (il backdrop sfocato ha così un contenuto
    // reale), ma è `inert`: non riceve focus né interazione mentre il modale è
    // aperto, coerente con aria-modal.
    return (
      <>
        <div inert>
          <BusinessLanding
            locale={bizLocale}
            onToggleLocale={toggleLocale}
            onTryDemo={() => setStage("nda")}
          />
        </div>
        <NdaDialog
          locale={bizLocale}
          onClose={() => setStage("landing")}
          onSigned={onSigned}
        />
      </>
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
