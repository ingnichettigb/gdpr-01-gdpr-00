import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEN_MIN_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function generateCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

const requestSchema = z.object({
  email: z.string().min(1).max(255),
});

/**
 * Codici errore OTP:
 *  - E-010: invio email fallito (Resend down / chiave mancante)
 *  - E-011: rate limit superato (>3 invii in 24h a email NON verificata)
 *  - E-012: codice errato o scaduto (verifica)
 *  - E-013: errore salvataggio / conferma post-update
 */
export const requestOtp = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return { sent: false, error: "invalid_email" as const, code: "E-013" };
    }

    // Import server-only nel body dell'handler per non farlo entrare nel bundle client.
    const { supabaseExternal } = await import(
      "@/integrations/supabase/client.external"
    );

    const { data: rows, error: qErr } = await supabaseExternal
      .from("lead_emails")
      .select("id, is_verified, otp_attempts, otp_window_start")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (qErr) {
      console.error("request-otp query error", qErr);
      return { sent: false, error: "server_error" as const, code: "E-013" };
    }

    const row = rows?.[0];
    const now = new Date();
    const code = generateCode();
    let attempts = 1;
    let windowStart = now.toISOString();

    if (row) {
      if (row.is_verified === true) {
        // Email GIÀ verificata → reset attempts a 0 prima di procedere
        // (non penalizzare un utente già verificato con il rate-limit
        // pensato per bloccare tentativi di verificare email altrui).
        attempts = 1;
        windowStart = now.toISOString();

        const { error: updErr } = await supabaseExternal
          .from("lead_emails")
          .update({
            verification_code: code,
            is_verified: false,
            verified_at: null,
            otp_attempts: attempts,
            otp_window_start: windowStart,
          })
          .eq("id", row.id);
        if (updErr) {
          console.error("request-otp update(verified) error", updErr);
          return { sent: false, error: "server_error" as const, code: "E-013" };
        }
      } else {
        // Email NON verificata → rate limit 3/24h
        const rowWindowStart = row.otp_window_start
          ? new Date(row.otp_window_start)
          : null;
        const withinWindow =
          rowWindowStart &&
          now.getTime() - rowWindowStart.getTime() < DAY_MS;

        if (withinWindow) {
          if ((row.otp_attempts ?? 0) >= 3) {
            return { sent: false, rateLimited: true, code: "E-011" };
          }
          attempts = (row.otp_attempts ?? 0) + 1;
          windowStart = rowWindowStart.toISOString();
        }

        const { error: updErr } = await supabaseExternal
          .from("lead_emails")
          .update({
            verification_code: code,
            otp_attempts: attempts,
            otp_window_start: windowStart,
          })
          .eq("id", row.id);
        if (updErr) {
          console.error("request-otp update error", updErr);
          return { sent: false, error: "server_error" as const, code: "E-013" };
        }
      }
    } else {
      const { error: insErr } = await supabaseExternal
        .from("lead_emails")
        .insert({
          email,
          verification_code: code,
          is_verified: false,
          source: "corporateboostservice",
          otp_attempts: attempts,
          otp_window_start: windowStart,
        });
      if (insErr) {
        console.error("request-otp insert error", insErr);
        return { sent: false, error: "server_error" as const, code: "E-013" };
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return { sent: false, error: "send_failed" as const, code: "E-010" };
    }

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Team CorporateBoost <team@corporateboostservice.eu>",
        to: [email],
        subject: `Codice di verifica: ${code}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:420px;margin:0 auto;padding:28px;border:1px solid #e5e7eb;border-radius:10px;">
          <p style="color:#6b7280;font-size:14px;margin:0 0 12px;">Ecco il tuo codice di verifica per accedere al corso:</p>
          <div style="font-size:40px;font-weight:700;letter-spacing:10px;text-align:center;color:#003153;margin:24px 0;font-family:monospace;">${code}</div>
          <p style="color:#6b7280;font-size:13px;text-align:center;margin:0;">Il codice scade tra 10 minuti.</p>
        </div>`,
      }),
    });

    if (!resendResp.ok) {
      const text = await resendResp.text();
      console.error("Resend error", resendResp.status, text);
      return { sent: false, error: "send_failed" as const, code: "E-010" };
    }

    return { sent: true };
  });

const verifySchema = z.object({
  email: z.string().min(1).max(255),
  code: z.string().regex(/^\d{6}$/),
});

export const verifyOtp = createServerFn({ method: "POST" })
  .validator(verifySchema)
  .handler(async ({ data }) => {
    const email = data.email.trim().toLowerCase();
    const code = data.code.trim();

    const { supabaseExternal } = await import(
      "@/integrations/supabase/client.external"
    );

    const { data: rows, error: qErr } = await supabaseExternal
      .from("lead_emails")
      .select("id, otp_window_start, created_at")
      .ilike("email", email)
      .eq("verification_code", code)
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (qErr) {
      console.error("verify-otp query error", qErr);
      return { ok: false, reason: "invalid" as const, code: "E-012" };
    }

    const row = rows?.[0];
    if (!row) {
      return { ok: false, reason: "invalid" as const, code: "E-012" };
    }

    const windowStart = row.otp_window_start
      ? new Date(row.otp_window_start)
      : row.created_at
        ? new Date(row.created_at)
        : null;

    const now = new Date();
    if (!windowStart || now.getTime() - windowStart.getTime() > TEN_MIN_MS) {
      return { ok: false, reason: "expired" as const, code: "E-012" };
    }

    const { error: updErr } = await supabaseExternal
      .from("lead_emails")
      .update({
        is_verified: true,
        verified_at: now.toISOString(),
      })
      .eq("id", row.id);

    if (updErr) {
      console.error("verify-otp update error", updErr);
      return { ok: false, reason: "invalid" as const, code: "E-013" };
    }

    // Ri-lettura di conferma: non fidarsi solo dell'assenza di errore
    // sull'update. Confermiamo esplicitamente che is_verified sia true
    // prima di dare esito positivo al frontend.
    const { data: confirmRow, error: confirmErr } = await supabaseExternal
      .from("lead_emails")
      .select("is_verified")
      .eq("id", row.id)
      .maybeSingle();

    if (confirmErr || !confirmRow || confirmRow.is_verified !== true) {
      console.error("verify-otp confirm re-read failed", confirmErr, confirmRow);
      return { ok: false, reason: "invalid" as const, code: "E-013" };
    }

    return { ok: true };
  });
