/**
 * Homepage business di Sanzy Poker (idea #12, #26).
 *
 * Vetrina B2B: slogan, pitch del doppio piatto, marchio tipografico (segnaposto,
 * come nella StartScreen), tre "scatti" mock del tavolo e la CTA "For Business /
 * Prova la demo" che apre il popup NDA. Toggle lingua IT/EN. Ogni testo passa
 * da `tb()`; nessun testo hardcoded.
 */
import { tb, type BizLocale } from "./landingI18n";

type BusinessLandingProps = {
  locale: BizLocale;
  onToggleLocale: () => void;
  onTryDemo: () => void;
};

export default function BusinessLanding({
  locale,
  onToggleLocale,
  onTryDemo,
}: BusinessLandingProps) {
  return (
    <main className="sanzy-biz">
      <div className="sanzy-biz__felt" aria-hidden />

      <header className="sanzy-biz__top">
        <div
          className="sanzy-biz__wordmark"
          role="img"
          aria-label={tb("brand.name", locale)}
        >
          <span className="sanzy-biz__wm-s">{tb("brand.sanzy", locale)}</span>
          <span className="sanzy-biz__wm-p">{tb("brand.poker", locale)}</span>
        </div>
        <button
          type="button"
          className="sanzy-biz__lang"
          onClick={onToggleLocale}
          aria-label={tb("landing.localeToggleAria", locale)}
        >
          {tb("landing.localeToggle", locale)}
        </button>
      </header>

      <section className="sanzy-biz__hero">
        <p className="sanzy-biz__eyebrow">{tb("landing.eyebrow", locale)}</p>
        <h1 className="sanzy-biz__tagline">{tb("landing.tagline", locale)}</h1>
        <p className="sanzy-biz__subtitle">{tb("landing.subtitle", locale)}</p>
        <p className="sanzy-biz__pitch">{tb("landing.pitch", locale)}</p>

        <div className="sanzy-biz__shots" aria-hidden>
          <span className="sanzy-biz__shot" />
          <span className="sanzy-biz__shot" />
          <span className="sanzy-biz__shot" />
        </div>

        <div className="sanzy-biz__cta">
          <span className="sanzy-biz__cta-badge">
            {tb("landing.forBusiness", locale)}
          </span>
          <button type="button" className="sanzy-biz__demo" onClick={onTryDemo}>
            {tb("landing.tryDemo", locale)} <span aria-hidden>🎰</span>
          </button>
          <span className="sanzy-biz__cta-sub">
            {tb("landing.tryDemoSub", locale)}
          </span>
        </div>
      </section>

      <style>{LANDING_CSS}</style>
    </main>
  );
}

const LANDING_CSS = `
.sanzy-biz {
  position: fixed;
  inset: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  padding: 20px 22px 40px;
  color: #f4efe4;
  font-family: "Manrope", system-ui, sans-serif;
  background: radial-gradient(140% 120% at 50% -10%, #2a1c10 0%, #150d07 55%, #0a0604 100%);
}
.sanzy-biz__felt {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background: radial-gradient(120% 90% at 50% 30%, #1c6a49 0%, #114a33 46%, #0a3122 74%, #072418 100%);
  box-shadow: inset 0 0 240px rgba(0,0,0,.55);
}
.sanzy-biz__top {
  position: relative; z-index: 1; display: flex; align-items: center;
  justify-content: space-between; margin-bottom: 8px;
}
.sanzy-biz__wordmark { display: flex; flex-direction: column; line-height: .9; }
.sanzy-biz__wm-s { font-size: 26px; font-weight: 900; letter-spacing: 4px; color: #f7f4ec; }
.sanzy-biz__wm-p { font-size: 15px; font-weight: 900; letter-spacing: 8px; margin-left: 3px; color: #d6342c; }
.sanzy-biz__lang {
  padding: 7px 14px; border-radius: 999px; border: 1px solid rgba(214,178,102,.4);
  background: rgba(6,32,22,.5); color: #f4efe4; font-size: 13px; font-weight: 800;
  cursor: pointer; font-family: inherit;
}
.sanzy-biz__lang:hover { border-color: #d6b466; }
.sanzy-biz__hero {
  position: relative; z-index: 1; margin: auto; width: 100%; max-width: 720px;
  box-sizing: border-box; text-align: center; display: flex; flex-direction: column;
  align-items: center; gap: 14px; padding: 24px 0;
}
.sanzy-biz__eyebrow { margin: 0; font-size: 12px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #d6b466; }
.sanzy-biz__tagline { margin: 0; font-size: clamp(30px, 6vw, 52px); font-weight: 900; letter-spacing: .5px; color: #f7f4ec; text-shadow: 0 6px 24px rgba(0,0,0,.5); }
.sanzy-biz__subtitle { margin: 0; font-size: clamp(15px, 2.6vw, 19px); font-weight: 700; color: #eaf2ec; max-width: 560px; }
.sanzy-biz__pitch { margin: 6px 0 0; font-size: 14px; line-height: 1.6; color: #bfd2c6; max-width: 560px; }
.sanzy-biz__shots { display: flex; gap: 14px; margin: 18px 0 6px; flex-wrap: wrap; justify-content: center; }
.sanzy-biz__shot {
  width: 168px; height: 104px; border-radius: 12px;
  background:
    radial-gradient(90% 120% at 50% 20%, rgba(23,87,61,.95), rgba(11,51,35,.95)),
    repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0 3px, transparent 3px 6px);
  border: 1px solid rgba(214,178,102,.4);
  box-shadow: 0 14px 30px rgba(0,0,0,.4), inset 0 0 40px rgba(0,0,0,.35);
}
.sanzy-biz__shot:nth-child(2) { transform: translateY(-10px) scale(1.04); }
.sanzy-biz__cta { display: flex; flex-direction: column; align-items: center; gap: 8px; margin-top: 22px; }
.sanzy-biz__cta-badge { font-size: 11px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #d6b466; }
.sanzy-biz__demo {
  padding: 16px 34px; border-radius: 999px; border: 1px solid #2fae6b;
  background: linear-gradient(180deg, #2fae6b 0%, #1d8850 100%); color: #f7fbf7;
  font-size: 18px; font-weight: 900; letter-spacing: .5px; cursor: pointer;
  font-family: inherit; box-shadow: 0 16px 34px rgba(0,0,0,.42);
  transition: transform .12s ease, box-shadow .12s ease;
}
.sanzy-biz__demo:hover { transform: translateY(-2px); box-shadow: 0 20px 42px rgba(0,0,0,.5); }
.sanzy-biz__cta-sub { font-size: 12.5px; color: #b7cabf; }
`;
