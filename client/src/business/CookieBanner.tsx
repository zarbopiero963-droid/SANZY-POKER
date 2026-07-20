/**
 * Banner cookie (GDPR) della landing business (idea #12, #26).
 *
 * Compare in fondo alla pagina finché l'utente non sceglie (Accetta/Rifiuta):
 * la scelta è persistita (`loadCookieConsent`/`saveCookieConsent`), così alla
 * visita successiva non ricompare. Non blocca la lettura della landing. Il link
 * apre la Cookie Policy nel modal legale (gestito dal genitore). Nessun testo
 * hardcoded fuori da `tb()`.
 */
import { useEffect, useState } from "react";
import { loadCookieConsent, saveCookieConsent } from "./demoSession";
import { tb, type BizLocale } from "./landingI18n";

type CookieBannerProps = {
  locale: BizLocale;
  onOpenPolicy: () => void;
};

export default function CookieBanner({
  locale,
  onOpenPolicy,
}: CookieBannerProps) {
  // Visibile solo se la scelta non è ancora stata fatta (consenso === null).
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setVisible(loadCookieConsent() === null);
  }, []);

  if (!visible) return null;

  const decide = (accepted: boolean) => {
    saveCookieConsent(accepted);
    setVisible(false);
  };

  return (
    <div
      className="sanzy-cookie"
      role="region"
      aria-label={tb("footer.cookie", locale)}
    >
      <p className="sanzy-cookie__text">
        {tb("cookie.text", locale)}{" "}
        <button
          type="button"
          className="sanzy-cookie__link"
          onClick={onOpenPolicy}
        >
          {tb("cookie.policyLink", locale)}
        </button>
      </p>
      <div className="sanzy-cookie__actions">
        <button
          type="button"
          className="sanzy-cookie__btn sanzy-cookie__btn--ghost"
          onClick={() => decide(false)}
        >
          {tb("cookie.decline", locale)}
        </button>
        <button
          type="button"
          className="sanzy-cookie__btn sanzy-cookie__btn--accept"
          onClick={() => decide(true)}
        >
          {tb("cookie.accept", locale)}
        </button>
      </div>
      <style>{COOKIE_CSS}</style>
    </div>
  );
}

const COOKIE_CSS = `
.sanzy-cookie {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 50;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 12px 20px;
  padding: 12px 18px;
  background: rgba(6, 16, 11, 0.94);
  border-top: 1px solid rgba(214, 178, 102, 0.35);
  color: #cfd8d1;
  font-family: "Manrope", system-ui, sans-serif;
  box-shadow: 0 -8px 24px rgba(0, 0, 0, 0.4);
}
.sanzy-cookie__text {
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  max-width: 720px;
  flex: 1 1 320px;
}
.sanzy-cookie__link {
  background: none;
  border: none;
  padding: 0;
  color: #d6b466;
  font: inherit;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}
.sanzy-cookie__actions {
  display: flex;
  gap: 10px;
  flex: 0 0 auto;
}
.sanzy-cookie__btn {
  padding: 9px 18px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 800;
  cursor: pointer;
  font-family: inherit;
  border: 1px solid transparent;
}
.sanzy-cookie__btn--ghost {
  background: transparent;
  border-color: rgba(207, 216, 209, 0.3);
  color: #cfd8d1;
}
.sanzy-cookie__btn--ghost:hover { border-color: rgba(207, 216, 209, 0.6); }
.sanzy-cookie__btn--accept {
  background: linear-gradient(180deg, #2fae6b 0%, #1d8850 100%);
  color: #f7fbf7;
  border-color: #2fae6b;
}
.sanzy-cookie__btn--accept:hover { background: linear-gradient(180deg, #37c079 0%, #229459 100%); }
`;
