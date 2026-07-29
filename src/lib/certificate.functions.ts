import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const APP_BASE_URL = "https://01-gdpr.corporateboostservice.eu";

/**
 * Genera il PDF dell'attestato lato server e lo invia via Resend:
 * - "to": email della ditta/acquirente (licenses.user_email)
 * - "cc": email della persona che ha completato il corso (puk_codes.assignee_email),
 *   solo se presente e diversa dal destinatario principale
 * Non lancia mai eccezioni verso il chiamante: eventuali errori vengono solo
 * loggati, perche' il salvataggio del certificato non deve MAI dipendere
 * dalla riuscita dell'invio email.
 */
async function sendAttestatoEmail(cert: {
  nome_snapshot: string | null;
  cf_snapshot: string | null;
  ditta_snapshot: string | null;
  luogo_nascita_snapshot: string | null;
  data_nascita_snapshot: string | null;
  certificate_number: string;
  issued_at: string;
}, toEmail: string | null, ccEmail: string | null) {
  try {
    if (!toEmail) {
      console.error("sendAttestatoEmail: nessuna email destinatario (licenses.user_email mancante)");
      return;
    }
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.error("sendAttestatoEmail: RESEND_API_KEY mancante");
      return;
    }

    const { buildAttestatoPdfBytes } = await import("@/lib/generateAttestatoPdf");
    const timbroAsset = (await import("@/assets/timbro_corporate.png.asset.json")).default;
    const stampUrl = `${APP_BASE_URL}${timbroAsset.url}`;

    const { pdfBytes, slug } = await buildAttestatoPdfBytes(
      {
        nome: cert.nome_snapshot ?? "",
        luogo: cert.luogo_nascita_snapshot ?? "",
        dataNascita: cert.data_nascita_snapshot ?? "",
        cf: cert.cf_snapshot ?? "",
        ditta: cert.ditta_snapshot ?? "",
        certNumber: cert.certificate_number,
        issuedAt: cert.issued_at,
      },
      stampUrl,
    );

    const pdfBase64 = Buffer.from(pdfBytes).toString("base64");
    const nome = cert.nome_snapshot ?? "il partecipante";

    const to = [toEmail];
    const cc =
      ccEmail && ccEmail.toLowerCase() !== toEmail.toLowerCase() ? [ccEmail] : [];

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendKey}`,
      },
      body: JSON.stringify({
        from: "Team CorporateBoost <team@corporateboostservice.eu>",
        to,
        ...(cc.length > 0 ? { cc } : {}),
        subject: `Attestato GDPR conseguito — ${nome}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px;border:1px solid #e5e7eb;border-radius:10px;color:#1f2937;">
          <p>Gentile Cliente,</p>
          <p>grazie per aver scelto il nostro corso di formazione GDPR per incaricati al trattamento dati.</p>
          <p>Siamo lieti di comunicarLe che <strong>${nome}</strong> ha completato con successo il corso e superato il test finale, conseguendo l'attestato di formazione allegato alla presente email.</p>
          <p>Può conservare questo attestato come prova della formazione svolta, ai fini della normativa sulla protezione dei dati personali (GDPR).</p>
          <p>Per qualsiasi necessità restiamo a disposizione.</p>
          <p style="margin-top:24px;">Cordiali saluti,<br/>Il team di CorporateBoostService<br/>team@corporateboostservice.eu</p>
        </div>`,
        attachments: [
          {
            filename: `Attestato_${slug}_${cert.certificate_number}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    if (!resendResp.ok) {
      const text = await resendResp.text();
      console.error("sendAttestatoEmail: Resend error", resendResp.status, text);
    }
  } catch (err) {
    console.error("sendAttestatoEmail exception", err);
  }
}

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

      // Invio email con attestato allegato: alla ditta/acquirente (licenses.user_email),
      // in copia conoscenza alla persona che ha completato il corso (puk_codes.assignee_email).
      // Fatto in background rispetto alla risposta al client, ma awaited qui per garantirne
      // il completamento nell'ambiente serverless; eventuali errori non bloccano mai
      // il salvataggio del certificato, gia' avvenuto con successo sopra.
      try {
        const [{ data: lic }, { data: pukRow }] = await Promise.all([
          data.license_id
            ? supabaseExternal.from("licenses").select("user_email").eq("id", data.license_id).maybeSingle()
            : Promise.resolve({ data: null }),
          data.puk_code
            ? supabaseExternal.from("puk_codes").select("assignee_email").eq("code", data.puk_code).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);
        await sendAttestatoEmail(
          {
            nome_snapshot: data.nome_snapshot ?? null,
            cf_snapshot: data.cf_snapshot ?? null,
            ditta_snapshot: data.ditta_snapshot ?? null,
            luogo_nascita_snapshot: data.luogo_nascita_snapshot ?? null,
            data_nascita_snapshot: data.data_nascita_snapshot ?? null,
            certificate_number: inserted.certificate_number,
            issued_at: inserted.issued_at,
          },
          lic?.user_email ?? null,
          pukRow?.assignee_email ?? null,
        );
      } catch (err) {
        console.error("saveCertificate: invio email fallito", err);
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
