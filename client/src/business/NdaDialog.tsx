/**
 * Popup NDA "click-wrap" a 3 slide + schermata di sblocco (idea #12, #26).
 *
 * Flusso: Slide 1 (gancio + nome/email) → Slide 2 (soluzione + azienda/ruolo) →
 * Slide 3 (testo NDA + checkbox obbligatoria) → "Entra nel futuro" registra la
 * firma (PR1: lato client) → schermata di sblocco con nota commerciale e
 * password di sessione → "Avvia tavolo 3D".
 *
 * La validazione e la creazione della sessione stanno in `demoSession.ts` (pure
 * e testate). Qui c'è solo la UI. Nessun testo hardcoded fuori da `tb()`.
 */
import { useEffect, useRef, useState } from "react";
import {
  createDemoSession,
  isNdaFormValid,
  saveDemoSession,
  validateNdaForm,
  type DemoSession,
  type NdaForm,
} from "./demoSession";
import { submitNda } from "./ndaService";
import { tb, type BizLocale } from "./landingI18n";
import { useFocusTrap } from "./useFocusTrap";

type NdaDialogProps = {
  locale: BizLocale;
  onClose: () => void;
  onSigned: (session: DemoSession) => void;
};

const EMPTY_FORM: NdaForm = {
  fullName: "",
  businessEmail: "",
  companyName: "",
  jobTitle: "",
  accepted: false,
};

export default function NdaDialog({
  locale,
  onClose,
  onSigned,
}: NdaDialogProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [form, setForm] = useState<NdaForm>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [session, setSession] = useState<DemoSession | null>(null);
  const [submitError, setSubmitError] = useState(false);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const copyTimeoutRef = useRef<number | null>(null);

  // Focus trap + ripristino del focus alla chiusura (hook condiviso con DemoExpired).
  useFocusTrap(dialogRef);

  const errors = validateNdaForm(form);
  const set = <K extends keyof NdaForm>(key: K, value: NdaForm[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const stepInvalid = (): boolean => {
    if (step === 1) return Boolean(errors.fullName || errors.businessEmail);
    if (step === 2) return Boolean(errors.companyName || errors.jobTitle);
    return Boolean(errors.accepted);
  };

  const goNext = () => {
    if (stepInvalid()) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setStep(prev => (prev === 3 ? 3 : ((prev + 1) as 2 | 3)));
  };

  const goBack = () => {
    setShowErrors(false);
    setStep(prev => (prev === 1 ? 1 : ((prev - 1) as 1 | 2)));
  };

  const sign = async () => {
    if (submitting) return; // invio in corso: non ri-mostrare errori sul modulo valido
    // Guardia finale sull'INTERO modulo (non solo la checkbox del passo 3): un
    // documento con pretese legali non deve mai nascere con campi vuoti.
    if (stepInvalid() || !isNdaFormValid(form)) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    setSubmitError(false);
    setSubmitting(true);
    try {
      const created = createDemoSession(form, Date.now(), locale);
      // PR1: stub locale. PR2 userà la risposta autorevole del server (fetch).
      const result = await submitNda(created);
      if (!result.ok) {
        setSubmitError(true);
        return;
      }
      // Onora il contratto: usa signatureId/password dalla RISPOSTA (nel PR2
      // arriveranno dal server), non quelli generati solo dal client.
      const finalized: DemoSession = {
        ...created,
        signatureId: result.signatureId,
        password: result.password,
        payload: { ...created.payload, signatureId: result.signatureId },
      };
      // Persistiamo SUBITO alla firma: un refresh sulla schermata di sblocco non
      // perde la sessione (prima la persistenza avveniva solo al "Avvia").
      saveDemoSession(finalized);
      setSession(finalized);
    } catch {
      // Il PR2 sostituirà submitNda con una fetch: qui il finally garantisce
      // che il pulsante non resti bloccato su "Registrazione…" se la promise
      // rigetta (rete/500), e l'utente vede un messaggio d'errore.
      setSubmitError(true);
    } finally {
      setSubmitting(false);
    }
  };

  const copyPassword = async () => {
    if (!session) return;
    try {
      await navigator.clipboard.writeText(session.password);
      setCopied(true);
      if (copyTimeoutRef.current !== null)
        window.clearTimeout(copyTimeoutRef.current);
      copyTimeoutRef.current = window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard non disponibile: la password resta comunque visibile.
    }
  };

  // Pulisce il timeout del "Copiato" allo smontaggio (no set-state su unmount).
  useEffect(
    () => () => {
      if (copyTimeoutRef.current !== null)
        window.clearTimeout(copyTimeoutRef.current);
    },
    []
  );

  const err = (key: keyof typeof errors) =>
    showErrors && errors[key] ? tb(`nda.error.${errors[key]}`, locale) : "";

  // Esc chiude il dialog durante la compilazione; a firma avvenuta (schermata di
  // sblocco) NON chiude, per non perdere la password mostrata.
  useEffect(() => {
    if (session) return;
    const onKey = (e: KeyboardEvent) => {
      // Non chiudere durante l'invio: eviteremmo uno smontaggio mentre submitNda
      // è pendente (nel PR2, con fetch reale, produrrebbe set-state su unmount).
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [session, submitting, onClose]);

  return (
    <div
      className="sanzy-nda-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={tb("nda.dialogTitle", locale)}
    >
      <div className="sanzy-nda" ref={dialogRef}>
        {session ? (
          <UnlockPanel
            locale={locale}
            password={session.password}
            copied={copied}
            onCopy={copyPassword}
            onLaunch={() => onSigned(session)}
          />
        ) : (
          <>
            <div className="sanzy-nda__head">
              <span className="sanzy-nda__step">
                {tb("nda.step", locale, { n: step })}
              </span>
              <button
                type="button"
                className="sanzy-nda__close"
                onClick={onClose}
                disabled={submitting}
                aria-label={tb("nda.close", locale)}
              >
                <span aria-hidden>×</span>
              </button>
            </div>

            <div className="sanzy-nda__body" key={step}>
              {step === 1 && (
                <>
                  <p className="sanzy-nda__text sanzy-nda__text--red">
                    {tb("nda.slide1.text", locale)}
                  </p>
                  <Field
                    id="nda-fullName"
                    label={tb("nda.field.fullName", locale)}
                    value={form.fullName}
                    onChange={v => set("fullName", v)}
                    error={err("fullName")}
                    autoFocus
                  />
                  <Field
                    id="nda-businessEmail"
                    label={tb("nda.field.businessEmail", locale)}
                    type="email"
                    value={form.businessEmail}
                    onChange={v => set("businessEmail", v)}
                    error={err("businessEmail")}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <p className="sanzy-nda__text sanzy-nda__text--gold">
                    {tb("nda.slide2.text", locale)}
                  </p>
                  <Field
                    id="nda-companyName"
                    label={tb("nda.field.companyName", locale)}
                    value={form.companyName}
                    onChange={v => set("companyName", v)}
                    error={err("companyName")}
                    autoFocus
                  />
                  <Field
                    id="nda-jobTitle"
                    label={tb("nda.field.jobTitle", locale)}
                    value={form.jobTitle}
                    onChange={v => set("jobTitle", v)}
                    error={err("jobTitle")}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <p className="sanzy-nda__text sanzy-nda__text--green">
                    {tb("nda.slide3.text", locale)}
                  </p>
                  <div className="sanzy-nda__ndabox">
                    {tb("nda.body", locale)}
                  </div>
                  <label className="sanzy-nda__check">
                    <input
                      type="checkbox"
                      checked={form.accepted}
                      onChange={e => set("accepted", e.target.checked)}
                      // eslint-disable-next-line jsx-a11y/no-autofocus -- focus iniziale dello step
                      autoFocus
                      aria-invalid={
                        showErrors && errors.accepted ? "true" : "false"
                      }
                      aria-describedby={
                        showErrors && errors.accepted
                          ? "nda-accepted-error"
                          : undefined
                      }
                    />
                    <span>{tb("nda.checkbox", locale)}</span>
                  </label>
                  {showErrors && errors.accepted && (
                    <p id="nda-accepted-error" className="sanzy-nda__err">
                      {tb(`nda.error.${errors.accepted}`, locale)}
                    </p>
                  )}
                  {submitError && (
                    <p className="sanzy-nda__err" role="alert">
                      {tb("nda.error.submit", locale)}
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="sanzy-nda__foot">
              {step > 1 ? (
                <button
                  type="button"
                  className="sanzy-nda__btn sanzy-nda__btn--ghost"
                  onClick={goBack}
                  disabled={submitting}
                >
                  <span aria-hidden>←</span> {tb("nda.back", locale)}
                </button>
              ) : (
                <span />
              )}

              {step < 3 && (
                <button
                  type="button"
                  className="sanzy-nda__btn"
                  onClick={goNext}
                >
                  {step === 2
                    ? tb("nda.slide2.cta", locale)
                    : tb("nda.next", locale)}{" "}
                  <span aria-hidden>→</span>
                </button>
              )}
              {step === 3 && (
                <button
                  type="button"
                  className="sanzy-nda__btn sanzy-nda__btn--go"
                  onClick={sign}
                  disabled={submitting}
                >
                  {submitting ? (
                    tb("nda.submitting", locale)
                  ) : (
                    <>
                      {tb("nda.submit", locale)} <span aria-hidden>🎰</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>
      <style>{NDA_CSS}</style>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = "text",
  autoFocus = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  error: string;
  type?: string;
  autoFocus?: boolean;
}) {
  const errorId = `${id}-error`;
  return (
    <label className="sanzy-nda__field" htmlFor={id}>
      <span className="sanzy-nda__label">{label}</span>
      <input
        id={id}
        className="sanzy-nda__input"
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        data-invalid={error ? "true" : "false"}
        aria-invalid={error ? "true" : "false"}
        aria-describedby={error ? errorId : undefined}
        // eslint-disable-next-line jsx-a11y/no-autofocus -- focus iniziale del dialog
        autoFocus={autoFocus}
      />
      {error && (
        <span id={errorId} className="sanzy-nda__err">
          {error}
        </span>
      )}
    </label>
  );
}

function UnlockPanel({
  locale,
  password,
  copied,
  onCopy,
  onLaunch,
}: {
  locale: BizLocale;
  password: string;
  copied: boolean;
  onCopy: () => void;
  onLaunch: () => void;
}) {
  // Alla firma il pulsante di invio a fuoco viene smontato: spostiamo il focus
  // sul titolo (focusabile via tabIndex=-1) così lo screen reader annuncia lo
  // sblocco e il focus resta dentro il dialog modale (non cade su body).
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    titleRef.current?.focus();
  }, []);
  return (
    <div className="sanzy-unlock">
      <h2 className="sanzy-unlock__title" ref={titleRef} tabIndex={-1}>
        {tb("unlock.title", locale)}
      </h2>
      <p className="sanzy-unlock__body">{tb("unlock.body", locale)}</p>
      <p className="sanzy-unlock__notice">{tb("unlock.notice", locale)}</p>
      <div className="sanzy-unlock__pwbox">
        <span className="sanzy-unlock__pwlabel">
          {tb("unlock.passwordLabel", locale)}
        </span>
        <div className="sanzy-unlock__pwrow">
          <code className="sanzy-unlock__pw">{password}</code>
          <button
            type="button"
            className="sanzy-nda__btn sanzy-nda__btn--ghost"
            onClick={onCopy}
          >
            {copied ? tb("unlock.copied", locale) : tb("unlock.copy", locale)}
          </button>
        </div>
      </div>
      <button
        type="button"
        className="sanzy-nda__btn sanzy-nda__btn--go sanzy-unlock__launch"
        onClick={onLaunch}
      >
        {tb("unlock.launch", locale)} <span aria-hidden>🎰</span>
      </button>
    </div>
  );
}

const NDA_CSS = `
.sanzy-nda-backdrop {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
  background: rgba(4, 10, 7, 0.72);
  backdrop-filter: blur(3px);
  font-family: "Manrope", system-ui, sans-serif;
}
.sanzy-nda {
  position: relative;
  margin: auto;
  width: 100%;
  max-width: 520px;
  box-sizing: border-box;
  border-radius: 18px;
  padding: 22px 24px 20px;
  color: #f4efe4;
  background: radial-gradient(120% 100% at 50% 0%, #17573d 0%, #0e3f2b 62%, #0b3323 100%);
  border: 2px solid rgba(214, 178, 102, 0.5);
  box-shadow: 0 30px 70px rgba(0, 0, 0, 0.55), inset 0 0 60px rgba(0, 0, 0, 0.3);
}
.sanzy-nda__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.sanzy-nda__step { font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #d6b466; }
.sanzy-nda__close { background: none; border: none; color: #cdd8d0; font-size: 26px; line-height: 1; cursor: pointer; padding: 0 4px; }
.sanzy-nda__close:hover { color: #f7f4ec; }
.sanzy-nda__body { display: flex; flex-direction: column; gap: 14px; animation: sanzy-slidein .22s ease; }
@keyframes sanzy-slidein { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
@media (prefers-reduced-motion: reduce) { .sanzy-nda__body { animation: none; } }
.sanzy-nda__text { margin: 0; font-size: 15px; line-height: 1.5; }
.sanzy-nda__text--red { color: #ffd7d2; border-left: 3px solid #d8342c; padding-left: 12px; }
.sanzy-nda__text--gold { color: #f4e6c2; border-left: 3px solid #d6b466; padding-left: 12px; }
.sanzy-nda__text--green { color: #d9f0e2; border-left: 3px solid #2fae6b; padding-left: 12px; }
.sanzy-nda__field { display: flex; flex-direction: column; gap: 6px; }
.sanzy-nda__label { font-size: 12px; font-weight: 700; color: #cfe0d6; }
.sanzy-nda__input {
  box-sizing: border-box; width: 100%; padding: 11px 13px; border-radius: 10px;
  border: 1px solid rgba(214, 178, 102, 0.35); background: rgba(6, 32, 22, 0.6);
  color: #f7f4ec; font-size: 15px; font-family: inherit;
}
.sanzy-nda__input:focus { outline: none; border-color: #d6b466; }
.sanzy-nda__input[data-invalid="true"] { border-color: #d8342c; }
.sanzy-nda__err { color: #ff8f86; font-size: 12px; font-weight: 700; }
.sanzy-nda__ndabox {
  max-height: 168px; overflow-y: auto; padding: 12px 14px; border-radius: 10px;
  background: rgba(6, 24, 17, 0.7); border: 1px solid rgba(214, 178, 102, 0.25);
  font-size: 12.5px; line-height: 1.55; color: #cfe0d6;
}
.sanzy-nda__check { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.4; cursor: pointer; }
.sanzy-nda__check input { margin-top: 3px; width: 18px; height: 18px; accent-color: #d6b466; flex: 0 0 auto; }
.sanzy-nda__foot { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; }
.sanzy-nda__btn {
  padding: 12px 20px; border-radius: 999px; border: 1px solid rgba(214, 178, 102, 0.5);
  background: rgba(214, 178, 102, 0.16); color: #f7f4ec; font-size: 14px; font-weight: 800;
  cursor: pointer; font-family: inherit; transition: transform .12s ease, background .12s ease;
}
.sanzy-nda__btn:hover { transform: translateY(-1px); background: rgba(214, 178, 102, 0.28); }
.sanzy-nda__btn:disabled { opacity: .6; cursor: default; transform: none; }
.sanzy-nda__btn--ghost { background: rgba(6, 32, 22, 0.5); }
.sanzy-nda__btn--go { background: linear-gradient(180deg, #2fae6b 0%, #1d8850 100%); border-color: #2fae6b; }
.sanzy-nda__btn--go:hover { background: linear-gradient(180deg, #37c079 0%, #229459 100%); }
.sanzy-unlock { display: flex; flex-direction: column; gap: 14px; text-align: center; }
.sanzy-unlock__title { margin: 4px 0 0; font-size: 22px; font-weight: 900; color: #d6b466; }
.sanzy-unlock__title:focus { outline: none; }
.sanzy-unlock__body { margin: 0; font-size: 14px; line-height: 1.5; color: #eaf2ec; }
.sanzy-unlock__notice { margin: 0; font-size: 12.5px; line-height: 1.5; color: #bfd2c6; background: rgba(6, 24, 17, 0.6); border-radius: 10px; padding: 12px 14px; }
.sanzy-unlock__pwbox { display: flex; flex-direction: column; gap: 8px; }
.sanzy-unlock__pwlabel { font-size: 12px; font-weight: 700; color: #cfe0d6; }
.sanzy-unlock__pwrow { display: flex; align-items: center; justify-content: center; gap: 10px; flex-wrap: wrap; }
.sanzy-unlock__pw { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: #f7f4ec; background: rgba(6, 32, 22, 0.7); border: 1px dashed rgba(214, 178, 102, 0.6); border-radius: 10px; padding: 8px 16px; }
.sanzy-unlock__launch { align-self: center; margin-top: 4px; }
@media (max-width: 480px) {
  .sanzy-nda { padding: 18px 16px 16px; }
  .sanzy-unlock__pw { font-size: 18px; }
}
`;
