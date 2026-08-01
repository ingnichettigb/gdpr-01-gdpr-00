/**
 * Lettura/scrittura dell'attivazione corrente (licenza + PUK + utente
 * applicativo). L'app non usa Supabase Auth: `userId` e' l'id della riga in
 * public.users, ed e' il valore usato come user_id in course_progress,
 * course_tests e certificates.
 */

export type Activation = {
  licenseId: string;
  licenseKey: string;
  puk: string;
  userId?: string;
};

function parse(raw: string | null): Activation | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.licenseId && parsed?.puk) return parsed as Activation;
    return null;
  } catch {
    return null;
  }
}

/** Attivazione della sessione corrente, con fallback su localStorage. */
export function getActivation(): Activation | null {
  if (typeof window === "undefined") return null;
  const fromSession = parse(sessionStorage.getItem("activation"));
  if (fromSession) return fromSession;
  const fromLocal = parse(localStorage.getItem("lastActivation"));
  if (fromLocal) {
    try {
      sessionStorage.setItem("activation", JSON.stringify(fromLocal));
    } catch {
      // ignore
    }
  }
  return fromLocal;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** userId valido dell'attivazione corrente, o null. */
export function getUserId(): string | null {
  const act = getActivation();
  if (act?.userId && UUID_RE.test(act.userId)) return act.userId;
  return null;
}
