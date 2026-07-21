/**
 * Testo legale canonico dell'NDA click-wrap (idea #12, tracking #26).
 *
 * FONTE UNICA condivisa client↔server: il client MOSTRA questo testo nel popup
 * (riempiendo nome/azienda/email dell'utente e sostituendo IP/timestamp/ID con
 * una nota «registrati all'invio») e il server lo riproduce IDENTICO nel PDF
 * (riempiendo IP/timestamp/ID reali). Così il testo accettato dall'utente e
 * quello registrato nel PDF sono lo stesso documento, sotto la stessa
 * `NDA_VERSION` — requisito di validità di un click-wrap.
 *
 * A ogni modifica sostanziale del testo va incrementata `NDA_VERSION` (il
 * backend rifiuta con 422 le firme con versione diversa da quella del server).
 */
export const NDA_VERSION = "1.0-clickwrap";

export type NdaLocale = "it" | "en";

export type NdaFillValues = {
  NOME: string;
  AZIENDA: string;
  EMAIL: string;
  IP: string;
  TIMESTAMP: string;
  SIGNATURE_ID: string;
};

const NDA_IT = `ACCORDO DI RISERVATEZZA E NON DIVULGAZIONE (NDA)

TRA:
Il Divulgante: Piero Zambo, ideatore e proprietario del software e della variante di gioco denominata "Sanzy Poker" (di seguito: "Divulgante" o "Proprietario").
E
Il Ricevente: {NOME}, per conto dell'azienda {AZIENDA} (Email aziendale: {EMAIL}), che accede alla demo software (di seguito: "Ricevente").

1. Oggetto della Divulgazione
Il Divulgante intende mostrare al Ricevente una demo interattiva 3D (Babylon.js) basata su una variante di gioco proprietaria denominata "Sanzy Poker", caratterizzata da regole matematiche uniche (6 carte personali, 8 comuni, doppio piatto simultaneo), protetta da Copyright Internazionale e data certa registrata.

2. Informazioni Riservate
Sono considerate "Informazioni Riservate" tutte le informazioni tecniche, il codice sorgente, le regole di gioco, le logiche matematiche dei bot, il design dell'interfaccia e le strategie commerciali visualizzate o apprese durante l'utilizzo della demo.

3. Obblighi di Non Divulgazione e Non Uso
Il Ricevente si impegna a:
- Mantenere il più stretto riserbo sulle Informazioni Riservate.
- Non copiare, riprodurre, decodificare (reverse engineering) o duplicare il software o le regole del gioco.
- Non utilizzare le informazioni apprese per sviluppare, direttamente o indirettamente, un software di poker concorrente o varianti simili.

4. Validità del Consenso (Clausola Click-Wrap)
Le Parti concordano espressamente che il presente Accordo viene stipulato e diviene pienamente valido e vincolante a livello internazionale tramite comportamento concludente, mediante la selezione della casella "Accetto" e il clic sul pulsante di invio del modulo web. I dati digitali associati (Indirizzo IP: {IP}, Timestamp UTC: {TIMESTAMP}, ID Firma: {SIGNATURE_ID}) costituiscono prova informatica della firma e dell'accettazione.`;

const NDA_EN = `MUTUAL NON-DISCLOSURE AGREEMENT (NDA)

BY AND BETWEEN:
The Disclosing Party: Piero Zambo, creator and sole owner of the software and game variant known as "Sanzy Poker" (hereinafter: "Disclosing Party").
AND
The Receiving Party: {NOME}, acting on behalf of the company {AZIENDA} (Business Email: {EMAIL}), accessing the software demo (hereinafter: "Receiving Party").

1. Purpose of Disclosure
The Disclosing Party wishes to showcase an interactive 3D demo (Babylon.js) based on a proprietary game variant known as "Sanzy Poker", characterized by unique mathematical rules (6 hole cards, 8 community cards, dual simultaneous pot), protected by International Copyright and certified timestamp.

2. Confidential Information
"Confidential Information" shall include all technical data, source code, game rules, mathematical bot logic, UI/UX design, and commercial strategies displayed or learned during the execution of this demo.

3. Non-Use and Non-Disclosure Obligations
The Receiving Party agrees to:
- Maintain the strictest confidentiality regarding the Confidential Information.
- Not copy, reproduce, reverse engineer, or duplicate the software or game mechanics.
- Not use the acquired information to develop, directly or indirectly, a competing poker software or similar game variants.

4. Validity and Electronic Consent (Click-Wrap Clause)
The Parties expressly agree that this Agreement is legally binding and internationally valid upon execution via electronic behavior, specifically by checking the mandatory "I Accept" box and clicking the form submission button. The associated digital logs (IP Address: {IP}, UTC Timestamp: {TIMESTAMP}, Signature ID: {SIGNATURE_ID}) shall constitute irrefutable digital proof of execution.`;

const TEMPLATES: Record<NdaLocale, string> = { it: NDA_IT, en: NDA_EN };

/** Testo NDA grezzo (coi segnaposto) per la lingua richiesta. */
export function ndaTemplate(locale: NdaLocale): string {
  return TEMPLATES[locale] ?? TEMPLATES.it;
}

/** Segnaposto ammessi nel testo NDA (chiavi di `NdaFillValues`). */
const NDA_PLACEHOLDER = /\{(NOME|AZIENDA|EMAIL|IP|TIMESTAMP|SIGNATURE_ID)\}/g;

/**
 * Riempie i segnaposto del testo NDA in UNA SOLA passata sul template originale.
 * È deliberato: una sostituzione sequenziale non funziona qui — se un valore utente
 * contenesse a sua volta un segnaposto (es. azienda = "Foo {SIGNATURE_ID}"),
 * una serie di `.replace()` lo ri-espanderebbe, alterando il testo legale
 * canonico usato sia per l'anteprima sia per il PDF firmato (rottura del
 * principio «accettato == registrato»). Con la passata unica i valori sostituiti
 * restano letterali e non possono innescare ulteriori espansioni. Il regex è
 * statico (nessuna costruzione da input → nessun rischio ReDoS).
 */
export function fillNdaText(locale: NdaLocale, values: NdaFillValues): string {
  return ndaTemplate(locale).replace(NDA_PLACEHOLDER, (_match, key: string) =>
    String(values[key as keyof NdaFillValues])
  );
}
