/**
 * Schermata d'ingresso di Sanzy Poker.
 *
 * Flusso richiesto: appena si apre l'URL si sceglie prima la LINGUA
 * (IT/EN/ES/FR), poi compare il marchio Sanzy Poker con i due pulsanti di
 * VARIANTE (Standard / Hi-Low). La variante scelta avvia la partita.
 *
 * Stile: fedele al tavolo fisico Sanzy — feltro verde, marchio tipografico
 * SANZY (bianco) / POKER (rosso), bordo ottone, quattro semi negli angoli e il
 * motivo dei due piatti (Piatto 1 orizzontale 3+2+1, Piatto 2 verticale a 2).
 * NB: il logo vero e proprio verrà ridisegnato a parte; qui si usa un marchio
 * tipografico come segnaposto, non l'SVG precedente.
 *
 * La logica di gioco non vive qui: questo componente sceglie solo lingua e
 * variante e le passa al canvas.
 */

import { useState } from "react";
import type { Variant } from "@/game/rules";
import {
  LOCALES,
  LOCALE_FLAG,
  LOCALE_NAMES,
  setLocale,
  t,
  type Locale,
} from "@/game/i18n";

const STORAGE_KEY = "sanzy.locale";

function readStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LOCALES as string[]).includes(stored))
      return stored as Locale;
  } catch {
    // localStorage può essere disabilitato: si ripiega sull'italiano.
  }
  return "it";
}

/**
 * Marchio tipografico SANZY (bianco) / POKER (rosso) — segnaposto del logo.
 * È un logo (role="img") con nome accessibile dall'i18n; anche il testo del
 * marchio passa da t() (valori identici nelle 4 lingue: è un brand costante).
 */
function Wordmark({ locale }: { locale: Locale }) {
  return (
    <div
      className="sanzy-wordmark"
      role="img"
      aria-label={t("brand.name", undefined, locale)}
    >
      <span className="wm-sanzy">{t("brand.sanzy", undefined, locale)}</span>
      <span className="wm-poker">{t("brand.poker", undefined, locale)}</span>
    </div>
  );
}

/**
 * Motivo del board dei due piatti, come sul tavolo reale: Piatto 1 orizzontale
 * 3+2+1, Piatto 2 verticale a 2. Puramente decorativo (feltro inciso).
 */
function BoardMotif() {
  return (
    <div className="sanzy-board" aria-hidden>
      <div className="board-pot1">
        <div className="board-group">
          <span className="slot" />
          <span className="slot" />
          <span className="slot" />
        </div>
        <div className="board-group">
          <span className="slot" />
          <span className="slot" />
        </div>
        <div className="board-group">
          <span className="slot" />
        </div>
      </div>
      <div className="board-pot2">
        <span className="slot" />
        <span className="slot" />
      </div>
    </div>
  );
}

type StartScreenProps = {
  onStart: (choice: { locale: Locale; variant: Variant }) => void;
};

export default function StartScreen({ onStart }: StartScreenProps) {
  const [step, setStep] = useState<"language" | "variant">("language");
  const [locale, setLocaleState] = useState<Locale>(readStoredLocale());

  const chooseLanguage = (next: Locale) => {
    setLocaleState(next);
    setLocale(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignora: la scelta resta valida per la sessione corrente.
    }
    document.documentElement.lang = next;
    setStep("variant");
  };

  const start = (variant: Variant) => {
    setLocale(locale);
    onStart({ locale, variant });
  };

  return (
    <main className="sanzy-start">
      <style>{START_CSS}</style>
      <div className="sanzy-felt" aria-hidden>
        <span className="felt-suit felt-suit--tl">♠</span>
        <span className="felt-suit felt-suit--tr">♥</span>
        <span className="felt-suit felt-suit--bl">♦</span>
        <span className="felt-suit felt-suit--br">♣</span>
      </div>

      <div className="sanzy-table">
        <p className="sanzy-tagline">{t("start.tagline", undefined, locale)}</p>
        <Wordmark locale={locale} />
        <BoardMotif />

        {step === "language" ? (
          <section
            className="sanzy-panel"
            aria-label={t("start.chooseLanguage", undefined, locale)}
          >
            <h1 className="sanzy-heading">
              {t("start.chooseLanguage", undefined, locale)}
            </h1>
            <div className="sanzy-lang-grid">
              {LOCALES.map(code => (
                <button
                  key={code}
                  type="button"
                  className={`sanzy-lang${code === locale ? " is-active" : ""}`}
                  onClick={() => chooseLanguage(code)}
                >
                  <span className="sanzy-lang-flag" aria-hidden>
                    {LOCALE_FLAG[code]}
                  </span>
                  <span className="sanzy-lang-name">{LOCALE_NAMES[code]}</span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <section
            className="sanzy-panel"
            aria-label={t("start.chooseVariant", undefined, locale)}
          >
            <button
              type="button"
              className="sanzy-back"
              onClick={() => setStep("language")}
            >
              {LOCALE_FLAG[locale]} {LOCALE_NAMES[locale]} ·{" "}
              {t("start.change", undefined, locale)}
            </button>
            <h2 className="sanzy-heading">
              {t("start.chooseVariant", undefined, locale)}
            </h2>
            <div className="sanzy-variant-grid">
              {(["standard", "hilow"] as Variant[]).map(variant => (
                <button
                  key={variant}
                  type="button"
                  className="sanzy-variant"
                  onClick={() => start(variant)}
                >
                  <span className="sanzy-variant-name">
                    {t(`variant.${variant}.name`, undefined, locale)}
                  </span>
                  <span className="sanzy-variant-desc">
                    {t(`variant.${variant}.desc`, undefined, locale)}
                  </span>
                  <span className="sanzy-variant-cta">
                    {t("start.play", undefined, locale)} →
                  </span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

const START_CSS = `
.sanzy-start {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  color: #f4efe4;
  font-family: "Manrope", system-ui, sans-serif;
  overflow-y: auto;
  /* Legno/ottone scuro intorno al feltro, come il bordo del tavolo. */
  background:
    radial-gradient(140% 120% at 50% -10%, #2a1c10 0%, #150d07 55%, #0a0604 100%);
}
/* Feltro verde a tutto schermo con vignettatura e trama leggera. */
.sanzy-felt {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(120% 90% at 50% 32%, #1c6a49 0%, #114a33 46%, #0a3122 74%, #072418 100%);
  box-shadow: inset 0 0 240px rgba(0,0,0,.55), inset 0 0 60px rgba(0,0,0,.35);
}
/* Trama del feltro: doppio reticolo diagonale molto tenue. */
.sanzy-felt::before {
  content: "";
  position: absolute;
  inset: 0;
  opacity: .5;
  background-image:
    repeating-linear-gradient(45deg, rgba(255,255,255,.020) 0 2px, transparent 2px 4px),
    repeating-linear-gradient(-45deg, rgba(0,0,0,.045) 0 2px, transparent 2px 4px);
}
.felt-suit {
  position: absolute;
  font-size: 64px;
  line-height: 1;
  color: rgba(255,255,255,.05);
  -webkit-user-select: none;
  user-select: none;
}
.felt-suit--tl { top: 26px; left: 30px; }
.felt-suit--tr { top: 26px; right: 30px; color: rgba(210,60,54,.09); }
.felt-suit--bl { bottom: 26px; left: 30px; color: rgba(210,60,54,.09); }
.felt-suit--br { bottom: 26px; right: 30px; }

/* Superficie centrale: ovale di feltro con bordo ottone. */
.sanzy-table {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 18px;
  padding: 40px 34px 38px;
  border-radius: 220px / 150px;
  background:
    radial-gradient(120% 100% at 50% 22%, #17573d 0%, #0e3f2b 60%, #0b3323 100%);
  border: 2px solid rgba(214,178,102,.55);
  box-shadow:
    0 30px 70px rgba(0,0,0,.55),
    inset 0 0 0 6px rgba(0,0,0,.18),
    inset 0 0 70px rgba(0,0,0,.30),
    inset 0 2px 0 rgba(255,255,255,.06);
}
.sanzy-tagline {
  margin: 0;
  font-size: 12px;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: #d6b466;
  font-weight: 800;
}
/* Marchio tipografico SANZY / POKER (segnaposto del logo). */
.sanzy-wordmark {
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: .92;
  margin-top: 2px;
}
.wm-sanzy {
  font-size: 62px;
  font-weight: 900;
  letter-spacing: 8px;
  color: #f7f4ec;
  text-shadow: 0 2px 0 rgba(0,0,0,.35), 0 10px 26px rgba(0,0,0,.5);
}
.wm-poker {
  font-size: 34px;
  font-weight: 900;
  letter-spacing: 14px;
  margin-left: 14px; /* compensa il tracking per centrare otticamente */
  color: #d6342c;
  text-shadow: 0 2px 0 rgba(0,0,0,.35), 0 8px 20px rgba(120,0,0,.35);
}
/* Motivo dei due piatti (feltro inciso). */
.sanzy-board {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin: 2px 0;
}
.board-pot1 { display: flex; align-items: center; gap: 13px; }
.board-group { display: flex; gap: 6px; }
.board-pot2 { display: flex; flex-direction: column; gap: 6px; }
.sanzy-board .slot {
  width: 17px;
  height: 24px;
  border-radius: 3px;
  border: 1.5px solid rgba(247,244,236,.72);
  background: rgba(255,255,255,.10);
  box-shadow: inset 0 1px 3px rgba(0,0,0,.3), 0 1px 2px rgba(0,0,0,.35);
}
.board-pot2 .slot {
  width: 24px;
  height: 17px;
  border-color: rgba(226,192,120,.9);
  background: rgba(214,178,102,.16);
}

.sanzy-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.sanzy-heading {
  margin: 2px 0 0;
  font-size: 19px;
  font-weight: 800;
  letter-spacing: .3px;
  color: #eef3ee;
}
.sanzy-lang-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.sanzy-lang {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 15px 18px;
  border-radius: 12px;
  border: 1px solid rgba(214,178,102,.28);
  background: rgba(6,32,22,.55);
  color: #eef3ee;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.sanzy-lang:hover {
  transform: translateY(-2px);
  border-color: #d6b466;
  background: rgba(23,87,61,.7);
}
.sanzy-lang.is-active {
  border-color: #d6b466;
  background: rgba(214,178,102,.16);
  box-shadow: 0 0 0 1px rgba(214,178,102,.35) inset;
}
.sanzy-lang-flag { font-size: 24px; line-height: 1; }

.sanzy-variant-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
.sanzy-variant {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
  gap: 8px;
  padding: 20px;
  border-radius: 14px;
  border: 1px solid rgba(214,178,102,.28);
  background: rgba(6,32,22,.55);
  color: #eef3ee;
  cursor: pointer;
  transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.sanzy-variant:hover {
  transform: translateY(-3px);
  border-color: #d6b466;
  background: rgba(23,87,61,.7);
  box-shadow: 0 14px 30px rgba(0,0,0,.4);
}
.sanzy-variant-name { font-size: 20px; font-weight: 800; color: #f7f4ec; }
.sanzy-variant-desc { font-size: 13px; color: #b7cabf; line-height: 1.4; }
.sanzy-variant-cta {
  margin-top: 4px;
  font-size: 13px;
  font-weight: 800;
  color: #d6b466;
  letter-spacing: .5px;
}
.sanzy-back {
  align-self: center;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid rgba(214,178,102,.28);
  background: rgba(6,32,22,.5);
  color: #d8e3db;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: border-color .12s ease, color .12s ease;
}
.sanzy-back:hover { border-color: #d6b466; color: #f7f4ec; }

@media (max-width: 540px) {
  .sanzy-table { padding: 32px 20px 30px; border-radius: 140px / 120px; }
  .wm-sanzy { font-size: 46px; letter-spacing: 6px; }
  .wm-poker { font-size: 26px; letter-spacing: 10px; margin-left: 10px; }
  .sanzy-lang-grid, .sanzy-variant-grid { grid-template-columns: 1fr; }
  .sanzy-heading { font-size: 18px; }
  .felt-suit { font-size: 44px; }
}
`;
