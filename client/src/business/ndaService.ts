/**
 * Servizio di "firma" dell'NDA.
 *
 * PR1 (frontend): STUB. La firma viene registrata solo lato client (la
 * sessione demo è creata da `createDemoSession`). Qui esponiamo il contratto
 * dell'endpoint che il PR2 (backend Express + Resend + PDF + log IP) andrà a
 * implementare, così i componenti chiamano già la forma definitiva.
 *
 * Contratto previsto (PR2): `POST /api/nda/sign` con `NdaPayload` nel body →
 * risponde con `{ ok, signatureId, password }`, genera il PDF, logga l'IP/ora e
 * invia l'email a pier.zar69@gmail.com. Finché l'endpoint non esiste, questo
 * stub risolve localmente senza rete.
 */
import type { DemoSession, NdaPayload } from "./demoSession";

export type NdaSignResult = {
  ok: boolean;
  signatureId: string;
  password: string;
  /** true quando la registrazione server (email/PDF/log) è avvenuta davvero. */
  serverAcknowledged: boolean;
};

/**
 * Registra la firma. PR1: nessuna chiamata di rete, ritorna i dati della
 * sessione creata lato client. `serverAcknowledged: false` segnala in modo
 * esplicito che email/PDF/log NON sono ancora attivi (arrivano nel PR2).
 */
export async function submitNda(session: DemoSession): Promise<NdaSignResult> {
  // TODO(PR2 #26): sostituire con
  //   await fetch("/api/nda/sign", { method: "POST", body: JSON.stringify(payload) })
  // e usare la risposta del server (password/signatureId autorevoli lato server).
  const _payload: NdaPayload = session.payload;
  void _payload;
  return {
    ok: true,
    signatureId: session.signatureId,
    password: session.password,
    serverAcknowledged: false,
  };
}
