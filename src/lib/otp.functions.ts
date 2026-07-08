import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = "https://ruopxyprezzxoirfrjrm.supabase.co";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TEN_MIN_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

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

function generateCode() {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return String(arr[0] % 1_000_000).padStart(6, "0");
}

const requestSchema = z.object({
  email: z.string().min(1).max(255),
});

export const requestOtp = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {

    const email = data.email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(email)) {
      return { sent: false, error: "invalid_email" as const };
    }

    const supabaseAdmin = createAdminClient();

    const { data: rows, error: qErr } = await supabaseAdmin
      .from("lead_emails")
      .select("id, is_verified, otp_attempts, otp_window_start")
      .ilike("email", email)
      .order("created_at", { ascending: false })
      .limit(1);

    if (qErr) {
      console.error("request-otp query error", qErr);
      return { sent: false, error: "server_error" as const };
    }

    const row = rows?.[0];
    const now = new Date();
    const code = generateCode();
    let attempts = 1;
    let windowStart = now.toISOString();

    if (row) {
      const rowWindowStart = row.otp_window_start
        ? new Date(row.otp_window_start)
        : null;
      const withinWindow =
        rowWindowStart &&
        now.getTime() - rowWindowStart.getTime() < DAY_MS;

      if (withinWindow) {
        if ((row.otp_attempts ?? 0) >= 3) {
          return { sent: false, rateLimited: true };
        }
        attempts = (row.otp_attempts ?? 0) + 1;
        windowStart = rowWindowStart.toISOString();
      }

      if (row.is_verified === false) {
        const { error: updErr } = await supabaseAdmin
          .from("lead_emails")
          .update({
            verification_code: code,
            otp_attempts: attempts,
            otp_window_start: windowStart,
          })
          .eq("id", row.id);
        if (updErr) {
          console.error("request-otp update error", updErr);
          return { sent: false, error: "server_error" as const };
        }
      } else {
        const { error: insErr } = await supabaseAdmin
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
          return { sent: false, error: "server_error" as const };
        }
      }
    } else {
      const { error: insErr } = await supabaseAdmin
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
        return { sent: false, error: "server_error" as const };
      }
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return { sent: false, error: "send_failed" as const };
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
      return { sent: false, error: "send_failed" as const };
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

    const supabaseAdmin = createAdminClient();

    const { data: rows, error: qErr } = await supabaseAdmin
      .from("lead_emails")
      .select("id, otp_window_start, created_at")
      .ilike("email", email)
      .eq("verification_code", code)
      .eq("is_verified", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (qErr) {
      console.error("verify-otp query error", qErr);
      return { ok: false, reason: "invalid" as const };
    }

    const row = rows?.[0];
    if (!row) {
      return { ok: false, reason: "invalid" as const };
    }

    const windowStart = row.otp_window_start
      ? new Date(row.otp_window_start)
      : row.created_at
        ? new Date(row.created_at)
        : null;

    const now = new Date();
    if (!windowStart || now.getTime() - windowStart.getTime() > TEN_MIN_MS) {
      return { ok: false, reason: "expired" as const };
    }

    const { error: updErr } = await supabaseAdmin
      .from("lead_emails")
      .update({
        is_verified: true,
        verified_at: now.toISOString(),
      })
      .eq("id", row.id);

    if (updErr) {
      console.error("verify-otp update error", updErr);
      return { ok: false, reason: "invalid" as const };
    }

    return { ok: true };
  });
