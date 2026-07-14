import { createClient } from "@supabase/supabase-js";

/**
 * Client Supabase dedicato al database ESTERNO condiviso
 * (project ref: ruopxyprezzxoirfrjrm) usato per licenses / puk_codes / lead_emails.
 *
 * IMPORTANTE: NON usare mai le variabili standard SUPABASE_URL /
 * SUPABASE_SERVICE_ROLE_KEY perché Lovable Cloud le sovrascrive a runtime
 * con quelle del database interno. Le variabili qui devono avere il prefisso
 * EXTERNAL_ per evitare la collisione.
 *
 * Da usare SOLO in file server-side (server functions / server routes).
 */
function createSupabaseExternalClient() {
  const url = process.env.EXTERNAL_SUPABASE_URL;
  const key = process.env.EXTERNAL_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing EXTERNAL_SUPABASE_URL or EXTERNAL_SUPABASE_SERVICE_ROLE_KEY",
    );
  }
  return createClient(url, key, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

export const supabaseExternal = createSupabaseExternalClient();
