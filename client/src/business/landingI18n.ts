/**
 * i18n della sezione business (landing + popup NDA + schermata di sblocco).
 *
 * È volutamente SEPARATO da `client/src/game/i18n.ts`: quello del gioco resta a
 * 4 lingue (IT/EN/ES/FR) e il suo test di completezza non deve rompersi. La
 * sezione B2B, per scelta con l'owner (#26), è solo IT/EN — target esteri di
 * lingua inglese e testo legale da curare. Ogni testo mostrato passa comunque
 * da `tb()` ed esiste in entrambe le lingue (un test lo verifica).
 */
export type BizLocale = "it" | "en";

export const BIZ_LOCALES: BizLocale[] = ["it", "en"];
export const DEFAULT_BIZ_LOCALE: BizLocale = "it";

type Entry = Record<BizLocale, string>;

/**
 * Dizionario: ogni chiave ha esattamente le due lingue. I testi delle slide
 * riprendono i contenuti "psicologici" concordati nell'idea #12.
 */
export const BIZ_STRINGS: Record<string, Entry> = {
  "landing.eyebrow": {
    it: "Demo riservata · Partner B2B",
    en: "Confidential demo · B2B partners",
  },
  "landing.tagline": {
    it: "Due piatti, una sola lettura",
    en: "Two pots, one read",
  },
  "landing.subtitle": {
    it: "Sei carte personali, 8 comuni e una decisione che cambia ogni strada.",
    en: "Six hole cards, 8 community cards and one decision that changes every path.",
  },
  "landing.pitch": {
    it: "Il poker classico ha un problema: i tempi morti. Sanzy Poker li elimina con un doppio piatto simultaneo: più azione, più puntate, zero noia.",
    en: "Classic poker has a problem: dead time. Sanzy Poker removes it with a dual simultaneous pot: more action, more bets, zero boredom.",
  },
  "landing.forBusiness": {
    it: "For Business",
    en: "For Business",
  },
  "landing.tryDemo": {
    it: "Prova la demo",
    en: "Try the demo",
  },
  "landing.tryDemoSub": {
    it: "Accesso su firma NDA · 15 minuti di gioco reale",
    en: "Access on NDA signature · 15 minutes of real play",
  },
  "landing.localeToggle": {
    it: "EN",
    en: "IT",
  },
  "landing.localeToggleAria": {
    it: "Cambia lingua in inglese",
    en: "Switch language to Italian",
  },
  // --- Popup NDA (3 slide) ---
  "nda.step": {
    it: "Passo {n} di 3",
    en: "Step {n} of 3",
  },
  "nda.next": {
    it: "Avanti",
    en: "Next",
  },
  "nda.back": {
    it: "Indietro",
    en: "Back",
  },
  "nda.close": {
    it: "Chiudi",
    en: "Close",
  },
  "nda.field.fullName": {
    it: "Nome e Cognome",
    en: "Full name",
  },
  "nda.field.businessEmail": {
    it: "Email aziendale",
    en: "Business email",
  },
  "nda.field.companyName": {
    it: "Nome dell'azienda",
    en: "Company name",
  },
  "nda.field.jobTitle": {
    it: "Ruolo aziendale (es. Product Manager)",
    en: "Job title (e.g. Product Manager)",
  },
  "nda.error.required": {
    it: "Campo obbligatorio",
    en: "Required field",
  },
  "nda.error.email": {
    it: "Inserisci un'email valida",
    en: "Enter a valid email",
  },
  "nda.slide1.text": {
    it: "Il poker classico ha un enorme problema: i tempi morti. I giocatori si annoiano, foldano subito e abbandonano il tavolo. Questo costa milioni alle piattaforme.",
    en: "Classic poker has a huge problem: dead time. Players get bored, fold early, and leave the table. This costs platforms millions.",
  },
  "nda.slide2.text": {
    it: "Immagina un ecosistema in cui il giocatore non vuole mai foldare. 6 carte in mano, 8 comuni e un doppio piatto simultaneo. Se perdi sotto, puoi dominare sopra. Più azione, più puntate, zero noia.",
    en: "Imagine an ecosystem where players never want to fold. 6 hole cards, 8 community cards and a dual simultaneous pot. Lose the bottom, dominate the top. More action, more bets, zero boredom.",
  },
  "nda.slide2.cta": {
    it: "Scopri il segreto",
    en: "Unlock the secret",
  },
  "nda.slide3.text": {
    it: "Stai per entrare in un tavolo che cambierà le regole del gioco. Questo software è protetto da copyright internazionale. Per sbloccare il motore 3D in Babylon.js, accetta l'accordo di riservatezza.",
    en: "You are about to step onto a table that changes the rules of the game. This software is protected by international copyright. To unlock the Babylon.js 3D core, please accept the confidentiality agreement.",
  },
  "nda.body": {
    it: "Accordo di riservatezza (NDA). Le informazioni, il gameplay e il codice mostrati nella demo di Sanzy Poker sono riservati e di proprietà dell'autore. Il destinatario si impegna a non divulgare, copiare o riprodurre quanto mostrato senza consenso scritto. L'accordo si intende accettato digitalmente tramite selezione della casella e invio del modulo, con registrazione di data, ora e indirizzo IP.",
    en: "Confidentiality agreement (NDA). The information, gameplay and code shown in the Sanzy Poker demo are confidential and owned by the author. The recipient agrees not to disclose, copy or reproduce anything shown without written consent. This agreement is deemed accepted digitally by ticking the checkbox and submitting the form, with date, time and IP address recorded.",
  },
  "nda.checkbox": {
    it: "Accetto i termini dell'accordo di non divulgazione (NDA) sopra riportato.",
    en: "I accept the terms of the non-disclosure agreement (NDA) shown above.",
  },
  "nda.submit": {
    it: "Entra nel futuro",
    en: "Enter the future",
  },
  "nda.submitting": {
    it: "Registrazione della firma…",
    en: "Recording your signature…",
  },
  "nda.error.submit": {
    it: "Registrazione non riuscita. Riprova.",
    en: "Signature failed. Please try again.",
  },
  // --- Schermata di sblocco ---
  "unlock.title": {
    it: "Accordo registrato con successo",
    en: "NDA successfully signed",
  },
  "unlock.body": {
    it: "La tua firma digitale e il tuo indirizzo IP sono stati registrati e associati alla tutela del software. Sanzy Poker™ è un asset commerciale di fascia alta, con codice 3D nativo in TypeScript/Babylon.js.",
    en: "Your digital signature and IP address have been recorded and linked to the software's protection. Sanzy Poker™ is a high-tier commercial asset, with native 3D code in TypeScript/Babylon.js.",
  },
  "unlock.notice": {
    it: "Questo prototipo è mostrato a partner in grado di valutare l'acquisizione dell'asset o licenze di distribuzione. Le basi di trattativa prevedono buyout totale (valutazione a partire da 500.000€) o licenza B2B con minimo garantito e royalty sul GGR.",
    en: "This prototype is shown to partners able to evaluate asset acquisition or distribution licensing. Negotiation baselines include a total buyout (valuation from €500,000) or a B2B license with a minimum guarantee and GGR royalties.",
  },
  "unlock.passwordLabel": {
    it: "La tua password di sessione temporanea è:",
    en: "Your temporary session password is:",
  },
  "unlock.copy": {
    it: "Copia",
    en: "Copy",
  },
  "unlock.copied": {
    it: "Copiata",
    en: "Copied",
  },
  "unlock.launch": {
    it: "Avvia tavolo 3D",
    en: "Launch 3D table",
  },
  // --- Timer / scadenza ---
  "timer.label": {
    it: "Tempo demo",
    en: "Demo time",
  },
  "demo.expired.title": {
    it: "Demo scaduta",
    en: "Demo expired",
  },
  "demo.expired.body": {
    it: "I 15 minuti della sessione demo sono terminati. Per una prova estesa o una trattativa, contatta l'autore.",
    en: "The 15-minute demo session has ended. For an extended trial or a negotiation, contact the author.",
  },
  "demo.expired.back": {
    it: "Torna alla home",
    en: "Back to home",
  },
};

/** Chiavi del dizionario business (per i test di completezza). */
export function bizKeys(): string[] {
  return Object.keys(BIZ_STRINGS);
}

/**
 * Risolve una chiave nella lingua richiesta, con interpolazione di `{param}`.
 * Se la chiave non esiste, ripiega sulla chiave stessa (comportamento visibile
 * nei test, mai in produzione perché le chiavi sono tipate a mano).
 */
export function tb(
  key: string,
  locale: BizLocale = DEFAULT_BIZ_LOCALE,
  params?: Record<string, string | number>
): string {
  const entry = BIZ_STRINGS[key];
  let text = entry ? entry[locale] : key;
  if (params) {
    for (const [name, value] of Object.entries(params)) {
      // Escape del nome parametro (difesa se un domani contenesse metacaratteri
      // regex) e replacement a funzione: un valore con `$&`/`$1` resta letterale.
      const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const stringValue = String(value);
      text = text.replace(
        new RegExp(`\\{${safeName}\\}`, "g"),
        () => stringValue
      );
    }
  }
  return text;
}
