/**
 * Codice prodotto di questa applicazione all'interno dell'ecosistema
 * multi-SaaS. Da usare in OGNI query di verifica licenza — mai stringhe
 * ripetute a mano nel codice.
 */
export const APP_CODE = "01-GDPR-00";

/**
 * Mappatura app_code -> course_id, usata SOLO come fallback quando la colonna
 * `courses.app_code` non è ancora valorizzata sul database esterno.
 * Unico punto da estendere se in futuro un'app gestisce più corsi.
 */
export const COURSE_ID_BY_APP_CODE: Record<string, string | undefined> = {
  [APP_CODE]: "a7622925-dfa6-4a5d-842b-f7a92d666d45",
};

/** Nome commerciale mostrato agli utenti (email, condizioni d'uso, ecc.) */
export const APP_NAME = "Corso My Privacy";

/** Versione corrente delle condizioni d'uso — cambiarla forza una nuova accettazione */
export const TERMS_VERSION = "v1";
