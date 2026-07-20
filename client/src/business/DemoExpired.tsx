/**
 * Schermata mostrata quando i 15 minuti della demo sono terminati (idea #12,
 * #26). Blocca il gioco e riporta alla home business. Nessun testo hardcoded.
 */
import { tb, type BizLocale } from "./landingI18n";

type DemoExpiredProps = {
  locale: BizLocale;
  onBackHome: () => void;
};

export default function DemoExpired({ locale, onBackHome }: DemoExpiredProps) {
  return (
    <div className="sanzy-expired" role="dialog" aria-modal="true">
      <div className="sanzy-expired__card">
        <h2 className="sanzy-expired__title">
          {tb("demo.expired.title", locale)}
        </h2>
        <p className="sanzy-expired__body">{tb("demo.expired.body", locale)}</p>
        <button
          type="button"
          className="sanzy-expired__btn"
          onClick={onBackHome}
        >
          {tb("demo.expired.back", locale)}
        </button>
      </div>
      <style>{EXPIRED_CSS}</style>
    </div>
  );
}

const EXPIRED_CSS = `
.sanzy-expired {
  position: fixed; inset: 0; z-index: 70; display: flex; align-items: center;
  justify-content: center; padding: 22px; background: rgba(4, 10, 7, 0.86);
  font-family: "Manrope", system-ui, sans-serif; color: #f4efe4;
}
.sanzy-expired__card {
  box-sizing: border-box; width: 100%; max-width: 440px; text-align: center;
  display: flex; flex-direction: column; gap: 14px; padding: 28px 26px; border-radius: 16px;
  background: radial-gradient(120% 100% at 50% 0%, #17573d 0%, #0e3f2b 62%, #0b3323 100%);
  border: 2px solid rgba(216, 52, 44, 0.55);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55);
}
.sanzy-expired__title { margin: 0; font-size: 22px; font-weight: 900; color: #ff6a5f; }
.sanzy-expired__body { margin: 0; font-size: 14px; line-height: 1.55; color: #eaf2ec; }
.sanzy-expired__btn {
  align-self: center; margin-top: 4px; padding: 12px 24px; border-radius: 999px;
  border: 1px solid rgba(214, 178, 102, 0.5); background: rgba(214, 178, 102, 0.16);
  color: #f7f4ec; font-size: 14px; font-weight: 800; cursor: pointer; font-family: inherit;
}
.sanzy-expired__btn:hover { background: rgba(214, 178, 102, 0.28); }
`;
