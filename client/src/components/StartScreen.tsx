/**
 * Schermata d'ingresso di Sanzy Poker.
 *
 * Flusso richiesto: appena si apre l'URL si sceglie prima la LINGUA
 * (IT/EN/ES/FR), poi compare il logo Sanzy Poker con i due pulsanti di
 * VARIANTE (Standard / Hi-Low). La variante scelta avvia la partita.
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
import SanzyLogo from "./SanzyLogo";

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
      <div className="sanzy-start-inner">
        {step === "language" ? (
          <section className="sanzy-start-panel" aria-label="language">
            <p className="sanzy-start-tagline">
              {t("start.tagline", undefined, locale)}
            </p>
            <div className="sanzy-start-logo sanzy-start-logo--small">
              <SanzyLogo title="Sanzy Poker" />
            </div>
            <h1 className="sanzy-start-heading">
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
          <section className="sanzy-start-panel" aria-label="variant">
            <button
              type="button"
              className="sanzy-start-back"
              onClick={() => setStep("language")}
            >
              {LOCALE_FLAG[locale]} {LOCALE_NAMES[locale]} ·{" "}
              {t("start.change", undefined, locale)}
            </button>
            <div className="sanzy-start-logo">
              <SanzyLogo title="Sanzy Poker" />
            </div>
            <h2 className="sanzy-start-heading">
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
  background:
    radial-gradient(120% 90% at 50% 12%, #1a2b25 0%, #0c1013 58%, #070a0c 100%);
  color: #f3f5f7;
  font-family: "Manrope", system-ui, sans-serif;
  overflow-y: auto;
}
.sanzy-start-inner { width: 100%; max-width: 620px; }
.sanzy-start-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 20px;
}
.sanzy-start-tagline {
  margin: 0;
  font-size: 13px;
  letter-spacing: 3px;
  text-transform: uppercase;
  color: #f49a35;
  font-weight: 800;
}
.sanzy-start-logo { width: 100%; max-width: 440px; filter: drop-shadow(0 18px 40px rgba(0,0,0,.55)); }
.sanzy-start-logo--small { max-width: 300px; }
.sanzy-start-logo svg { width: 100%; height: auto; display: block; }
.sanzy-start-heading {
  margin: 4px 0 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: .3px;
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
  padding: 16px 18px;
  border-radius: 12px;
  border: 1px solid #ffffff1c;
  background: #191e26;
  color: #eef1f4;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.sanzy-lang:hover { transform: translateY(-2px); border-color: #f49a3577; background: #212833; }
.sanzy-lang.is-active { border-color: #f49a35; background: #2a2013; }
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
  border: 1px solid #ffffff1c;
  background: #191e26;
  color: #eef1f4;
  cursor: pointer;
  transition: transform .12s ease, border-color .12s ease, background .12s ease;
}
.sanzy-variant:hover { transform: translateY(-3px); border-color: #f49a35; background: #212833; }
.sanzy-variant-name { font-size: 20px; font-weight: 800; }
.sanzy-variant-desc { font-size: 13px; color: #9da4ae; line-height: 1.4; }
.sanzy-variant-cta { margin-top: 4px; font-size: 13px; font-weight: 800; color: #f49a35; letter-spacing: .5px; }
.sanzy-start-back {
  align-self: center;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid #ffffff1c;
  background: #161b22;
  color: #c7ccd3;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}
.sanzy-start-back:hover { border-color: #f49a3577; color: #f3f5f7; }
@media (max-width: 520px) {
  .sanzy-lang-grid, .sanzy-variant-grid { grid-template-columns: 1fr; }
  .sanzy-start-heading { font-size: 19px; }
}
`;
