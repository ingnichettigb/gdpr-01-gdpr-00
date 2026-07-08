import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const APP_CODE = "02-GDPR-00";
const SUPABASE_URL = "https://ruopxyprezzxoirfrjrm.supabase.co";

function createAdminClient() {
  const url = process.env.SUPABASE_URL ?? SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export type ActivationReason =
  | "email_not_verified"
  | "license_not_found"
  | "email_mismatch"
  | "license_expired"
  | "puk_not_found"
  | "puk_already_used"
  | "server_error";

export type ActivationResult =
  | { ok: true; licenseId: string; licenseKey: string }
  | { ok: false; reason: ActivationReason; code: string };

const CODE_MAP: Record<ActivationReason, string> = {
  email_not_verified: "E-001",
  license_not_found: "E-101",
  email_mismatch: "E-102",
  license_expired: "E-103",
  puk_not_found: "E-201",
  puk_already_used: "E-202",
  server_error: "E-500",
};

function fail(reason: ActivationReason): ActivationResult {
  return { ok: false, reason, code: CODE_MAP[reason] };
}

const activationSchema = z.object({
  email: z.string().email().min(1).max(255),
  licenseKey: z.string().min(1).max(255),
  puk: z.string().min(1).max(255),
});

/**
 * Verifica licenza + PUK e attiva. Ritorna sempre un ActivationResult tipizzato
 * con un codice numerico univoco per ciascun motivo di fallimento (E-001…E-500).
 *
 * Il flusso usa l'email verificata via OTP custom (non Supabase Auth), quindi
 * l'attivazione avviene in modalità service-role. Non viene creata alcuna riga
 * in auth.users / public.users: l'identità è rappresentata dall'email
 * verificata che viene scritta in licenses.user_email.
 */
export const verifyAndActivateLicense = createServerFn({ method: "POST" })
  .validator(activationSchema)
  .handler(async ({ data }): Promise<ActivationResult> => {
    try {
      const email = data.email.trim().toLowerCase();
      const licenseKey = data.licenseKey.trim();
      const puk = data.puk.trim();
      const nowIso = new Date().toISOString();

      if (!email) {
        return fail("email_not_verified");
      }

      const supabaseAdmin = createAdminClient();

      // 1. Licenza per (license_key, app_code, is_active=true)
      const { data: lic, error: licErr } = await supabaseAdmin
        .from("licenses")
        .select("id, is_active, expires_at, user_email, activated_at, license_key")
        .eq("license_key", licenseKey)
        .eq("app_code", APP_CODE)
        .eq("is_active", true)
        .maybeSingle();

      if (licErr) {
        console.error("license lookup error", licErr);
        return fail("server_error");
      }
      if (!lic) return fail("license_not_found");

      if (lic.user_email && lic.user_email.toLowerCase() !== email) {
        return fail("email_mismatch");
      }
      if (lic.expires_at && lic.expires_at < nowIso) {
        return fail("license_expired");
      }

      // 2. PUK per (code) → verifica mapping con la licenza
      const { data: pukRow, error: pukErr } = await supabaseAdmin
        .from("puk_codes")
        .select("id, used, expires_at")
        .eq("code", puk)
        .maybeSingle();
      if (pukErr) {
        console.error("puk lookup error", pukErr);
        return fail("server_error");
      }
      if (!pukRow) return fail("puk_not_found");

      const { data: map, error: mapErr } = await supabaseAdmin
        .from("license_puk_map")
        .select("license_id")
        .eq("puk_id", pukRow.id)
        .eq("license_id", lic.id)
        .maybeSingle();
      if (mapErr) {
        console.error("license-puk map lookup error", mapErr);
        return fail("server_error");
      }
      if (!map) return fail("puk_not_found");

      if (pukRow.expires_at && pukRow.expires_at < nowIso) {
        return fail("puk_not_found");
      }

      // 3. PUK già usato — distinzione idempotenza vs abuso
      if (pukRow.used === true) {
        if (
          lic.activated_at &&
          lic.user_email &&
          lic.user_email.toLowerCase() === email
        ) {
          // Riattivazione stesso utente → idempotente
          return { ok: true, licenseId: lic.id, licenseKey: lic.license_key ?? licenseKey };
        }
        return fail("puk_already_used");
      }

      // 4. Attivazione PUK (anti-race con eq(used,false))
      const { data: pukUpd, error: pukUpdErr } = await supabaseAdmin
        .from("puk_codes")
        .update({ used: true, used_at: nowIso, user_id: null })
        .eq("id", pukRow.id)
        .eq("used", false)
        .select("id");

      if (pukUpdErr) {
        console.error("puk update error", pukUpdErr);
        return fail("server_error");
      }
      if (!pukUpd || pukUpd.length === 0) return fail("puk_already_used");

      // 5. Assegna email e activated_at alla licenza (solo se libera o già mia)
      const { error: licUpdErr } = await supabaseAdmin
        .from("licenses")
        .update({ user_email: email, activated_at: nowIso })
        .eq("id", lic.id);
      if (licUpdErr) {
        console.error("license update error", licUpdErr);
        return fail("server_error");
      }

      return { ok: true, licenseId: lic.id, licenseKey: lic.license_key ?? licenseKey };
    } catch (err) {
      console.error("verifyAndActivateLicense exception", err);
      return fail("server_error");
    }
  });
