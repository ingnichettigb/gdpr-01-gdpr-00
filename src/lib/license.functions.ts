import { supabase } from "@/integrations/supabase/client";

export const APP_CODE = "02-GDPR-00";

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

/**
 * Verifica licenza + PUK e attiva. Ritorna sempre un ActivationResult tipizzato
 * con un codice numerico univoco per ciascun motivo di fallimento (E-001…E-500).
 * L'utente deve essere autenticato (Supabase Auth OTP).
 */
export async function verifyAndActivateLicense(input: {
  licenseKey: string;
  puk: string;
}): Promise<ActivationResult> {
  try {
    const licenseKey = input.licenseKey.trim();
    const puk = input.puk.trim();

    // 0. Sessione utente verificata
    const { data: userRes, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userRes?.user?.email || !userRes.user.id) {
      return fail("email_not_verified");
    }
    const email = userRes.user.email.toLowerCase();
    const userId = userRes.user.id;
    const nowIso = new Date().toISOString();

    // 1. Licenza per (license_key, app_code, is_active=true)
    const { data: lic, error: licErr } = await supabase
      .from("licenses")
      .select("id, is_active, expires_at, user_email, activated_at, license_key")
      .eq("license_key", licenseKey)
      .eq("app_code", APP_CODE)
      .eq("is_active", true)
      .maybeSingle();

    if (licErr) return fail("server_error");
    if (!lic) return fail("license_not_found");

    if (
      lic.user_email &&
      lic.user_email.toLowerCase() !== email
    ) {
      return fail("email_mismatch");
    }
    if (lic.expires_at && lic.expires_at < nowIso) {
      return fail("license_expired");
    }

    // 2. PUK per (code) → verifica mapping con la licenza
    const { data: pukRow, error: pukErr } = await supabase
      .from("puk_codes")
      .select("id, used, expires_at")
      .eq("code", puk)
      .maybeSingle();
    if (pukErr) return fail("server_error");
    if (!pukRow) return fail("puk_not_found");

    const { data: map, error: mapErr } = await supabase
      .from("license_puk_map")
      .select("license_id")
      .eq("puk_id", pukRow.id)
      .eq("license_id", lic.id)
      .maybeSingle();
    if (mapErr) return fail("server_error");
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
    const { data: pukUpd, error: pukUpdErr } = await supabase
      .from("puk_codes")
      .update({ used: true, used_at: nowIso, user_id: userId })
      .eq("id", pukRow.id)
      .eq("used", false)
      .select("id");

    if (pukUpdErr) return fail("server_error");
    if (!pukUpd || pukUpd.length === 0) return fail("puk_already_used");

    // 5. Assegna email e activated_at alla licenza (solo se libera o già mia)
    const { error: licUpdErr } = await supabase
      .from("licenses")
      .update({ user_email: email, activated_at: nowIso })
      .eq("id", lic.id);
    if (licUpdErr) return fail("server_error");

    // 6. Upsert riga users
    await supabase
      .from("users")
      .upsert({ id: userId, email, name: email }, { onConflict: "id" });

    return { ok: true, licenseId: lic.id, licenseKey: lic.license_key ?? licenseKey };
  } catch {
    return fail("server_error");
  }
}
