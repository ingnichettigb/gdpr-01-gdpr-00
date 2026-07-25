import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { APP_CODE } from "@/lib/app-config";

export type ActivationReason =
  | "email_not_verified"
  | "license_not_found"
  | "email_mismatch"
  | "license_expired"
  | "puk_not_found"
  | "puk_already_used"
  | "server_error";

export type ActivationResult =
  | { ok: true; licenseId: string; licenseKey: string; puk: string }
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
 * Verifica licenza + PUK e attiva. Ritorna sempre un ActivationResult
 * tipizzato con un codice univoco per ciascun motivo di fallimento
 * (E-001, E-101..E-103, E-201..E-202, E-500).
 *
 * Usa SEMPRE `supabaseExternal` (database condiviso project ref
 * ruopxyprezzxoirfrjrm) — MAI il client Lovable Cloud, che punterebbe a
 * un database interno diverso privo di questi dati.
 */
export const verifyAndActivateLicense = createServerFn({ method: "POST" })
  .validator(activationSchema)
  .handler(async ({ data }): Promise<ActivationResult> => {
    try {
      const email = data.email.trim().toLowerCase();
      const licenseKey = data.licenseKey.trim();
      const puk = data.puk.trim();
      const nowIso = new Date().toISOString();

      if (!email) return fail("email_not_verified");

      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );

      // 0. L'email deve risultare verificata in lead_emails
      const { data: leadRows, error: leadErr } = await supabaseExternal
        .from("lead_emails")
        .select("id, is_verified")
        .ilike("email", email)
        .eq("is_verified", true)
        .limit(1);
      if (leadErr) {
        console.error("lead lookup error", leadErr);
        return fail("server_error");
      }
      if (!leadRows || leadRows.length === 0) {
        return fail("email_not_verified");
      }

      // 1. Licenza: license_key + APP_CODE + is_active
      const { data: lic, error: licErr } = await supabaseExternal
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

      // 2. Email della licenza deve corrispondere (case-insensitive)
      if (lic.user_email && lic.user_email.toLowerCase() !== email) {
        return fail("email_mismatch");
      }

      // 3. Scadenza licenza
      if (lic.expires_at && lic.expires_at < nowIso) {
        return fail("license_expired");
      }

      // 4. PUK: cerca in puk_codes per license_id + code
      const { data: pukRow, error: pukErr } = await supabaseExternal
        .from("puk_codes")
        .select("id, used, used_at")
        .eq("license_id", lic.id)
        .eq("code", puk)
        .maybeSingle();
      if (pukErr) {
        console.error("puk lookup error", pukErr);
        return fail("server_error");
      }
      if (!pukRow) return fail("puk_not_found");

      // 5. PUK già usato: consenti solo se licenza già attivata (re-ingresso)
      if (pukRow.used === true) {
        if (lic.activated_at) {
          return {
            ok: true,
            licenseId: lic.id,
            licenseKey: lic.license_key ?? licenseKey,
            puk,
          };
        }
        return fail("puk_already_used");
      }

      // 6. Attivazione PUK (anti-race con eq(used,false))
      const { data: pukUpd, error: pukUpdErr } = await supabaseExternal
        .from("puk_codes")
        .update({ used: true, used_at: nowIso })
        .eq("id", pukRow.id)
        .eq("used", false)
        .select("id");

      if (pukUpdErr) {
        console.error("puk update error", pukUpdErr);
        return fail("server_error");
      }
      if (!pukUpd || pukUpd.length === 0) return fail("puk_already_used");

      // 7. Licenza: valorizza email e activated_at (solo se ancora null)
      const licUpdatePayload: Record<string, unknown> = { user_email: email };
      if (!lic.activated_at) licUpdatePayload.activated_at = nowIso;

      const { error: licUpdErr } = await supabaseExternal
        .from("licenses")
        .update(licUpdatePayload)
        .eq("id", lic.id);
      if (licUpdErr) {
        console.error("license update error", licUpdErr);
        return fail("server_error");
      }

      return {
        ok: true,
        licenseId: lic.id,
        licenseKey: lic.license_key ?? licenseKey,
      };
    } catch (err) {
      console.error("verifyAndActivateLicense exception", err);
      return fail("server_error");
    }
  });
