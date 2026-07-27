import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pukSchema = z.object({ puk: z.string().min(1).max(255) });

export type CertificateRow = {
  id: string;
  certificate_number: string | null;
  issued_at: string | null;
  puk_code: string | null;
  license_id: string | null;
  license_key: string | null;
  nome_snapshot: string | null;
  cf_snapshot: string | null;
  ditta_snapshot: string | null;
  luogo_nascita_snapshot: string | null;
  data_nascita_snapshot: string | null;
  test_score: number | null;
  test_result: string | null;
};

/**
 * Cerca il certificato per PUK. Ritorna la riga completa o null.
 * Usa supabaseExternal via dynamic import DENTRO l'handler.
 */
export const checkCertificateByPuk = createServerFn({ method: "POST" })
  .validator(pukSchema)
  .handler(async ({ data }): Promise<CertificateRow | null> => {
    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );
      const { data: cert, error } = await supabaseExternal
        .from("certificates")
        .select("*")
        .eq("puk_code", data.puk)
        .maybeSingle();
      if (error) {
        console.error("checkCertificateByPuk error", error);
        return null;
      }
      return (cert as CertificateRow) ?? null;
    } catch (err) {
      console.error("checkCertificateByPuk exception", err);
      return null;
    }
  });

const saveSchema = z.object({
  certificate_number: z.string().min(1),
  license_id: z.string().min(1),
  license_key: z.string().nullable().optional(),
  puk_code: z.string().nullable().optional(),
  nome_snapshot: z.string().nullable().optional(),
  cf_snapshot: z.string().nullable().optional(),
  ditta_snapshot: z.string().nullable().optional(),
  luogo_nascita_snapshot: z.string().nullable().optional(),
  data_nascita_snapshot: z.string().nullable().optional(),
  test_score: z.number().nullable().optional(),
  test_result: z.string().nullable().optional(),
});

export type SaveCertificateResult =
  | { ok: true; id: string; issued_at: string; certificate_number: string }
  | { ok: false; error: string; existing?: CertificateRow };

/**
 * Salva il certificato. Idempotente per puk_code: se esiste già un certificato
 * per lo stesso PUK, ritorna quello esistente senza duplicare.
 */
export const saveCertificate = createServerFn({ method: "POST" })
  .validator(saveSchema)
  .handler(async ({ data }): Promise<SaveCertificateResult> => {
    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );

      // Idempotenza: se il PUK ha già un certificato, ritornalo.
      if (data.puk_code) {
        const { data: existing } = await supabaseExternal
          .from("certificates")
          .select("*")
          .eq("puk_code", data.puk_code)
          .maybeSingle();
        if (existing) {
          return {
            ok: true,
            id: existing.id,
            issued_at: existing.issued_at,
            certificate_number: existing.certificate_number,
          };
        }
      }

      const { data: inserted, error } = await supabaseExternal
        .from("certificates")
        .insert({
          certificate_number: data.certificate_number,
          license_id: data.license_id,
          license_key: data.license_key ?? null,
          puk_code: data.puk_code ?? null,
          nome_snapshot: data.nome_snapshot ?? null,
          cf_snapshot: data.cf_snapshot ?? null,
          ditta_snapshot: data.ditta_snapshot ?? null,
          luogo_nascita_snapshot: data.luogo_nascita_snapshot ?? null,
          data_nascita_snapshot: data.data_nascita_snapshot ?? null,
          test_score: data.test_score ?? null,
          test_result: data.test_result ?? null,
        })
        .select("id, issued_at, certificate_number")
        .single();

      if (error || !inserted) {
        console.error("saveCertificate insert error", error);
        return { ok: false, error: error?.message ?? "insert_failed" };
      }
      return {
        ok: true,
        id: inserted.id,
        issued_at: inserted.issued_at,
        certificate_number: inserted.certificate_number,
      };
    } catch (err) {
      console.error("saveCertificate exception", err);
      return { ok: false, error: "server_error" };
    }
  });
