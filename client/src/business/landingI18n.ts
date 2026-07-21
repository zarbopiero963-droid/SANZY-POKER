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

/**
 * Auto-riconoscimento della lingua business dalle preferenze del browser
 * (`navigator.languages` / `navigator.language`). Pura e deterministica per
 * essere testabile senza un DOM.
 *
 * Regola: la sezione B2B è solo IT/EN. Si scorre l'elenco in ordine di
 * preferenza dell'utente e si sceglie la PRIMA lingua riconosciuta —
 * italiano → `it`, qualsiasi altra lingua nota → `en` (target esteri
 * anglofoni). Se l'elenco è vuoto/indefinito (nessuna informazione) si torna
 * a `DEFAULT_BIZ_LOCALE`. Il confronto è sul prefisso ISO (`it`, `it-IT`,
 * `it-CH` → italiano) e case-insensitive.
 */
export function detectBizLocale(
  languages?: readonly string[] | string | null
): BizLocale {
  const list =
    typeof languages === "string"
      ? [languages]
      : Array.isArray(languages)
        ? languages
        : [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const primary = raw.trim().toLowerCase().split("-")[0];
    if (primary === "it") return "it";
    if (primary === "en") return "en";
    // Altra lingua nota (es. fr/es/de): per il funnel B2B estero → inglese.
    if (primary.length >= 2) return "en";
  }
  return DEFAULT_BIZ_LOCALE;
}

type Entry = Record<BizLocale, string>;

/**
 * Dizionario: ogni chiave ha esattamente le due lingue. I testi delle slide
 * riprendono i contenuti "psicologici" concordati nell'idea #12.
 */
export const BIZ_STRINGS = {
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
  // Selettore lingua a due pulsanti espliciti (IT | EN): quello attivo è
  // evidenziato e cliccare una lingua la seleziona direttamente — niente più
  // ambiguità «mostra la destinazione» del vecchio toggle.
  "landing.langSelectAria": {
    it: "Seleziona la lingua",
    en: "Select language",
  },
  "landing.langItAria": {
    it: "Passa all'italiano",
    en: "Switch to Italian",
  },
  "landing.langEnAria": {
    it: "Passa all'inglese",
    en: "Switch to English",
  },
  // Marchio: valori costanti nelle due lingue (brand), ma passano da tb().
  "brand.name": { it: "Sanzy Poker", en: "Sanzy Poker" },
  "brand.sanzy": { it: "SANZY", en: "SANZY" },
  "brand.poker": { it: "POKER", en: "POKER" },
  "brand.tag": { it: "B2B DEMO", en: "B2B DEMO" },
  // --- Popup NDA (3 slide) ---
  "nda.dialogTitle": {
    it: "Accordo di riservatezza",
    en: "Confidentiality agreement",
  },
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
  // Segnaposto mostrato al posto di IP/timestamp/ID nel testo NDA prima della
  // firma: sul PDF del server questi campi portano i valori reali.
  "nda.recordedOnSubmit": {
    it: "(registrato all'invio)",
    en: "(recorded upon submission)",
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
    it: "Sblocco della demo…",
    en: "Unlocking the demo…",
  },
  "nda.error.submit": {
    it: "Registrazione non riuscita. Riprova.",
    en: "Signature failed. Please try again.",
  },
  "nda.error.alreadySigned": {
    it: "Questa email aziendale ha già firmato l'NDA e avviato una demo. Contatta l'autore per una prova estesa.",
    en: "This business email has already signed the NDA and started a demo. Contact the author for an extended trial.",
  },
  "nda.error.outdated": {
    it: "La versione dell'accordo è cambiata. Ricarica la pagina per continuare.",
    en: "The agreement version has changed. Please reload the page to continue.",
  },
  "nda.error.rateLimited": {
    it: "Troppi tentativi da questa rete. Riprova tra qualche minuto.",
    en: "Too many attempts from this network. Please try again in a few minutes.",
  },
  // --- Schermata di sblocco ---
  "unlock.title": {
    it: "Accesso demo sbloccato",
    en: "Demo access unlocked",
  },
  "unlock.body": {
    it: "Il tuo consenso è stato acquisito per questa sessione demo. Sanzy Poker™ è un asset commerciale di fascia alta, con codice 3D nativo in TypeScript/Babylon.js.",
    en: "Your consent has been captured for this demo session. Sanzy Poker™ is a high-tier commercial asset, with native 3D code in TypeScript/Babylon.js.",
  },
  "unlock.notice": {
    it: "Questo prototipo è mostrato a partner in grado di valutare l'acquisizione dell'asset o licenze di distribuzione. Le basi di trattativa prevedono buyout totale (valutazione a partire da 500.000€) o licenza B2B con minimo garantito e royalty sul GGR.",
    en: "This prototype is shown to partners able to evaluate asset acquisition or distribution licensing. Negotiation baselines include a total buyout (valuation from €500,000) or a B2B license with a minimum guarantee and GGR royalties.",
  },
  "unlock.companyCopyRequested": {
    it: "Stiamo inviando una copia dell'NDA firmato alla tua email aziendale (controlla anche lo spam):",
    en: "We're sending a copy of the signed NDA to your business email (check your spam too):",
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
  // --- Banner cookie (GDPR) ---
  "cookie.text": {
    it: "Usiamo cookie tecnici necessari al funzionamento della demo (gestione della sessione e del timer di gioco) e cookie analitici anonimi. Cliccando su «Accetta» acconsenti al loro utilizzo.",
    en: "We use technical cookies required to run the demo (session and game-timer handling) and anonymous analytics cookies. By clicking “Accept” you consent to their use.",
  },
  "cookie.accept": {
    it: "Accetta tutti",
    en: "Accept all",
  },
  "cookie.decline": {
    it: "Rifiuta",
    en: "Decline",
  },
  "cookie.policyLink": {
    it: "Leggi la Cookie Policy",
    en: "Read the Cookie Policy",
  },
  // --- Footer legale ---
  "footer.legalNav": {
    it: "Note legali",
    en: "Legal",
  },
  "footer.terms": {
    it: "Termini e Condizioni",
    en: "Terms & Conditions",
  },
  "footer.privacy": {
    it: "Privacy Policy",
    en: "Privacy Policy",
  },
  "footer.cookie": {
    it: "Cookie Policy",
    en: "Cookie Policy",
  },
  "footer.rights": {
    it: "© Piero Zarbo — Sanzy Poker. Tutti i diritti riservati.",
    en: "© Piero Zarbo — Sanzy Poker. All rights reserved.",
  },
  // --- Documenti legali (modal) ---
  "legal.close": {
    it: "Chiudi",
    en: "Close",
  },
  "legal.terms.title": {
    it: "Termini e Condizioni (Piattaforma demo B2B)",
    en: "Terms & Conditions (B2B demo platform)",
  },
  "legal.terms.body": {
    it: "1. Proprietà. Questo sito e il laboratorio Sanzy Poker sono di proprietà di Piero Zarbo.\n\n2. Idoneità B2B. L'accesso alla demo 3D è riservato esclusivamente a entità aziendali, operatori iGaming e professionisti del settore autorizzati.\n\n3. Limitazioni d'uso. La demo è fornita a soli fini di valutazione. Lo sfruttamento commerciale, la messa in produzione o il reverse engineering del software presentato sono severamente vietati ai sensi delle leggi internazionali sul copyright.\n\n4. Esclusione di responsabilità. La variante software è un prototipo. Lo sviluppatore non è responsabile di interruzioni temporanee del servizio o di incompatibilità con il sistema locale durante la finestra di valutazione di 15 minuti.",
    en: "1. Ownership. This website and the Sanzy Poker laboratory are owned by Piero Zarbo.\n\n2. B2B Eligibility. Access to the 3D demo is strictly reserved for corporate entities, iGaming operators, and authorized industry professionals.\n\n3. Usage Limitation. The demo is provided for evaluation purposes only. Commercial exploitation, staging, or reverse-engineering of the presented software is strictly prohibited under International Copyright laws.\n\n4. Disclaimer. The software variant is a prototype. The developer is not liable for temporary service interruptions or local system incompatibilities during the 15-minute evaluation slot.",
  },
  "legal.privacy.title": {
    it: "Informativa sulla privacy",
    en: "Privacy Policy",
  },
  "legal.privacy.body": {
    it: "Titolare del trattamento: Piero Zarbo (pier.zar69@gmail.com).\n\nDati raccolti. Nel modulo NDA raccogliamo nome e cognome, email aziendale, nome dell'azienda e ruolo. Alla firma il server genera un identificativo di firma e la data/ora e registra il tuo indirizzo IP.\n\nFinalità. I dati sono trattati per gestire l'accordo di riservatezza, dare accesso alla demo e per contatti commerciali conseguenti.\n\nBase giuridica. Esecuzione di misure precontrattuali e legittimo interesse dell'azienda.\n\nDestinatari. Alla firma i dati vengono inviati al nostro server; un PDF dell'NDA firmato (con i dati sopra indicati, indirizzo IP, data/ora e identificativo di firma) viene recapitato via email al titolare tramite il fornitore di posta transazionale Resend. Il consenso ai cookie, la lingua scelta, l'avvio della demo e una chiave tecnica per il recupero della firma (indicizzata da un identificatore derivato dall'email, non dall'email in chiaro, con scadenza) restano invece nel tuo browser (localStorage).\n\nConservazione. I dati sono conservati per il tempo necessario alla trattativa e agli obblighi legali connessi all'NDA.\n\nDiritti. Puoi chiedere accesso, rettifica o cancellazione dei tuoi dati scrivendo a pier.zar69@gmail.com.",
    en: "Data controller: Piero Zarbo (pier.zar69@gmail.com).\n\nData collected. In the NDA form we collect full name, business email, company name and job title. On signature the server generates a signature ID and a timestamp and logs your IP address.\n\nPurpose. Data is processed to manage the confidentiality agreement, grant demo access and for the resulting business contact.\n\nLegal basis. Performance of pre-contractual measures and the company's legitimate interest.\n\nRecipients. On signature the data is sent to our server; a PDF of the signed NDA (including the data above, IP address, timestamp and signature ID) is delivered by email to the controller through the transactional email provider Resend. Your cookie consent, chosen language, demo start and a technical key for signature recovery (indexed by an identifier derived from the email, not the email itself, with an expiry) instead remain in your browser (localStorage).\n\nRetention. Data is kept for as long as needed for the negotiation and the legal obligations tied to the NDA.\n\nRights. You may request access, rectification or erasure of your data by writing to pier.zar69@gmail.com.",
  },
  "legal.cookie.title": {
    it: "Cookie Policy",
    en: "Cookie Policy",
  },
  "legal.cookie.body": {
    it: "Cookie tecnici. Usiamo l'archiviazione locale del browser (localStorage) per ricordare il consenso ai cookie, la lingua scelta e — dopo la firma dell'NDA — l'avvio della sessione demo, così che il timer di 15 minuti non riparta al refresh. Sono necessari al funzionamento della demo.\n\nCookie analitici. Eventuali cookie analitici sono anonimi e servono solo a misurare l'uso in forma aggregata.\n\nGestione. Puoi rifiutare i cookie non necessari dal banner; puoi inoltre cancellare i dati locali svuotando l'archiviazione del sito dal tuo browser.",
    en: "Technical cookies. We use the browser's local storage (localStorage) to remember your cookie consent, your chosen language and — after signing the NDA — the start of the demo session, so the 15-minute timer does not restart on refresh. These are required for the demo to work.\n\nAnalytics cookies. Any analytics cookies are anonymous and only measure usage in aggregate form.\n\nManagement. You can decline non-essential cookies from the banner; you can also clear local data by emptying this site's storage in your browser.",
  },
} satisfies Record<string, Entry>;

/** Unione letterale delle chiavi del dizionario business: typo = errore a compile-time. */
export type BizKey = keyof typeof BIZ_STRINGS;

/** Chiavi del dizionario business (per i test di completezza). */
export function bizKeys(): BizKey[] {
  return Object.keys(BIZ_STRINGS) as BizKey[];
}

/**
 * Risolve una chiave nella lingua richiesta, con interpolazione di `{param}`.
 * La chiave è tipata (`BizKey`), quindi i typo sono errori di compilazione; il
 * fallback alla chiave grezza resta solo come rete di sicurezza a runtime.
 */
export function tb(
  key: BizKey,
  locale: BizLocale = DEFAULT_BIZ_LOCALE,
  params?: Record<string, string | number>
): string {
  const entry = BIZ_STRINGS[key];
  let text: string = entry ? entry[locale] : key;
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
