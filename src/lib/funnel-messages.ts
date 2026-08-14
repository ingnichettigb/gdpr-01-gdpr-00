/**
 * Messaggi per i motivi di blocco restituiti da getFunnelStatus
 * (src/lib/funnel-guard.functions.ts). Usati da attivazione.tsx per
 * mostrare un errore reale invece di rimandare in silenzio al form vuoto.
 *
 * Namespace di codici dedicato (E-3xx) per non confondersi con quelli di
 * verifyAndActivateLicense (E-001, E-1xx, E-2xx) — sono due controlli
 * distinti anche se simili, in due momenti diversi del funnel.
 */
export const FUNNEL_REASON_MESSAGES: Record<string, string> = {
  puk_non_trovato:
    "Il codice PUK non risulta valido. Verifica di aver usato il link corretto o contattaci. (E-301)",
  puk_scaduto:
    "Il tempo a disposizione per completare questo corso è scaduto. Contattaci per un'estensione. (E-302)",
  puk_senza_licenza:
    "Questo PUK non risulta collegato a nessuna licenza. Contattaci per assistenza. (E-303)",
  licenza_non_trovata:
    "La licenza collegata a questo PUK non risulta trovata. Contattaci per assistenza. (E-304)",
  licenza_disattivata:
    "Questa licenza è stata disattivata. Contattaci per maggiori informazioni. (E-305)",
  licenza_scaduta:
    "Questa licenza è scaduta. Contattaci per il rinnovo. (E-306)",
  errore_server:
    "Si è verificato un errore tecnico nel verificare il tuo accesso. Riprova tra qualche minuto o contattaci indicando il codice errore. (E-500)",
};

/** Fallback per motivi non mappati esplicitamente (non dovrebbe accadere,
 * ma se getFunnelStatus restituisse un `reason` nuovo non ancora elencato
 * sopra, mostriamo comunque qualcosa invece di restare silenziosi). */
export function funnelReasonMessage(reason: string | null): string {
  if (reason && FUNNEL_REASON_MESSAGES[reason]) {
    return FUNNEL_REASON_MESSAGES[reason];
  }
  return FUNNEL_REASON_MESSAGES.errore_server;
}

const SESSION_KEY = "funnel_block_reason";

/** Da chiamare SUBITO PRIMA di navigare verso /attivazione quando
 * getFunnelStatus ha risposto valid:false (o è fallita l'intera chiamata).
 * attivazione.tsx la legge al mount e la mostra come errore. */
export function setFunnelBlockReason(reason: string | null): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(SESSION_KEY, reason ?? "errore_server");
  } catch {
    // ignore
  }
}

/** Da chiamare in attivazione.tsx al mount: legge il motivo (se presente)
 * e lo consuma subito, cosi' non ricompare a un successivo refresh/redirect
 * che non c'entra nulla con questo. */
export function consumeFunnelBlockReason(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const reason = sessionStorage.getItem(SESSION_KEY);
    if (reason) sessionStorage.removeItem(SESSION_KEY);
    return reason;
  } catch {
    return null;
  }
}
