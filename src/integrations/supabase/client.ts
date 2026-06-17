import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ruopxyprezzxoirfrjrm.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1b3B4eXByZXp6eG9pcmZyanJtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg0NDE5NTgsImV4cCI6MjA5NDAxNzk1OH0.2bp3R69j_RYtxtZGZc920UDo5Q81jniJ7gTNVeuNN8c";

// persistSession abilitato per il nuovo funnel /accesso (email + OTP).
// Il vecchio flusso anonimo (/, /corso, /test, /attestato) non usa l'auth.
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    storageKey: "cbs-auth",
  },
});
