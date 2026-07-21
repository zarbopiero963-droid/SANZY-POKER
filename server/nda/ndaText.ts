/**
 * Testo NDA lato server: RI-ESPORTA la fonte canonica condivisa
 * (`shared/ndaText.ts`), così il PDF usa lo stesso identico testo che il client
 * mostra all'utente. Import relativo (non `@shared`) perché il bundle esbuild
 * del server non risolve gli alias del tsconfig.
 */
export {
  NDA_VERSION,
  ndaTemplate,
  fillNdaText,
  type NdaLocale,
  type NdaFillValues,
} from "../../shared/ndaText";
