/**
 * Modal legale della sezione business: Termini e Condizioni, Privacy Policy o
 * Cookie Policy (idea #12, #26). Aperto dai link del footer della landing e dal
 * banner cookie. Testo lungo scrollabile; nessun testo hardcoded fuori da `tb()`.
 *
 * Accessibilità: `role="dialog"` + `aria-modal`, focus trap e ripristino del
 * focus (hook condiviso), Esc per chiudere, titolo referenziato via
 * `aria-labelledby`.
 */
import { useEffect, useRef } from "react";
import { tb, type BizLocale } from "./landingI18n";
import { useFocusTrap } from "./useFocusTrap";

export type LegalDoc = "terms" | "privacy" | "cookie";

type LegalModalProps = {
  locale: BizLocale;
  doc: LegalDoc;
  onClose: () => void;
};

export default function LegalModal({ locale, doc, onClose }: LegalModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  useFocusTrap(cardRef);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const titleId = `sanzy-legal-title-${doc}`;

  return (
    <div
      className="sanzy-legal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <div className="sanzy-legal" ref={cardRef}>
        <div className="sanzy-legal__head">
          <h2 id={titleId} className="sanzy-legal__title">
            {tb(`legal.${doc}.title`, locale)}
          </h2>
          <button
            type="button"
            className="sanzy-legal__close"
            onClick={onClose}
            aria-label={tb("legal.close", locale)}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- focus iniziale del dialog
            autoFocus
          >
            <span aria-hidden>×</span>
          </button>
        </div>
        <div className="sanzy-legal__body">
          {tb(`legal.${doc}.body`, locale)}
        </div>
      </div>
      <style>{LEGAL_CSS}</style>
    </div>
  );
}

const LEGAL_CSS = `
.sanzy-legal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
  background: rgba(4, 10, 7, 0.72);
  backdrop-filter: blur(3px);
  font-family: "Manrope", system-ui, sans-serif;
}
.sanzy-legal {
  position: relative;
  margin: auto;
  width: 100%;
  max-width: 620px;
  box-sizing: border-box;
  border-radius: 16px;
  padding: 20px 22px;
  color: #f4efe4;
  background: radial-gradient(120% 100% at 50% 0%, #16442f 0%, #0e3a28 60%, #0b3122 100%);
  border: 1px solid rgba(214, 178, 102, 0.5);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55);
}
.sanzy-legal__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.sanzy-legal__title {
  margin: 0;
  font-size: 18px;
  font-weight: 900;
  color: #d6b466;
}
.sanzy-legal__close {
  background: none;
  border: none;
  color: #cdd8d0;
  font-size: 26px;
  line-height: 1;
  cursor: pointer;
  padding: 0 4px;
  flex: 0 0 auto;
}
.sanzy-legal__close:hover { color: #f7f4ec; }
.sanzy-legal__body {
  max-height: 60vh;
  overflow-y: auto;
  white-space: pre-line;
  font-size: 13.5px;
  line-height: 1.6;
  color: #dbe7de;
  padding-right: 6px;
}
`;
