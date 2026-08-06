import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pukSchema = z.object({ puk: z.string().min(1) });

export type FunnelStatus = {
  valid: boolean;
  reason: string | null;
  module1: boolean;
  module2: boolean;
  certified: boolean;
};

/**
 * Unica fonte di verita' server-side per lo stato del funnel di un dato PUK.
 *
 * PERCHE' ESISTE: corso.tsx e test.tsx risolvono il PUK "attivo" del browser
 * con un fallback a 3 livelli (sessionStorage.activation -> localStorage
 * attestato_data -> localStorage lastActivation), pensato per permettere il
 * recupero dell'attestato da un browser diverso. Il problema: gli ultimi due
 * livelli sopravvivono per sempre e non vengono mai puliti da attivazione.tsx.
 * Quindi una tab nuova (sessionStorage vuoto), su un browser che in passato
 * aveva completato un PUK, ripescava quel PUK vecchio e i suoi flag
 * "completed_*" locali, bypassando l'intero funnel licenza/PUK/corso.
 *
 * Questa funzione va chiamata ad OGNI mount di corso.tsx/test.tsx/attestato.tsx
 * per rivalidare col server il PUK risolto lato client, prima di concedere
 * qualsiasi accesso. Nessuna pagina deve fidarsi di localStorage da solo.
 */
export const getFunnelStatus = createServerFn({ method: "POST" })
  .validator(pukSchema)
  .handler(async ({ data }): Promise<FunnelStatus> => {
    const notValid = (reason: string): FunnelStatus => ({
      valid: false,
      reason,
      module1: false,
      module2: false,
      certified: false,
    });

    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );

      const { data: puk, error: pukErr } = await supabaseExternal
        .from("puk_codes")
        .select("id, license_id, expires_at")
        .eq("code", data.puk)
        .maybeSingle();

      if (pukErr) {
        console.error("getFunnelStatus: errore lettura puk_codes", pukErr);
        return notValid("errore_server");
      }
      if (!puk) return notValid("puk_non_trovato");
      if (puk.expires_at && new Date(puk.expires_at) < new Date()) {
        return notValid("puk_scaduto");
      }
      if (!puk.license_id) return notValid("puk_senza_licenza");

      const { data: license, error: licErr } = await supabaseExternal
        .from("licenses")
        .select("is_active, expires_at")
        .eq("id", puk.license_id)
        .maybeSingle();

      if (licErr) {
        console.error("getFunnelStatus: errore lettura licenses", licErr);
        return notValid("errore_server");
      }
      if (!license) return notValid("licenza_non_trovata");
      if (license.is_active === false) return notValid("licenza_disattivata");
      if (license.expires_at && new Date(license.expires_at) < new Date()) {
        return notValid("licenza_scaduta");
      }

      const { data: progress } = await supabaseExternal
        .from("video_progress")
        .select("module_key, completed")
        .eq("puk_code", data.puk);

      const module1 = !!progress?.some(
        (p) => p.module_key === "lezione1" && p.completed,
      );
      const module2 = !!progress?.some(
        (p) => p.module_key === "lezione2" && p.completed,
      );

      const { data: cert } = await supabaseExternal
        .from("certificates")
        .select("id")
        .eq("puk_code", data.puk)
        .maybeSingle();

      return {
        valid: true,
        reason: null,
        module1,
        module2,
        certified: !!cert,
      };
    } catch (err) {
      console.error("getFunnelStatus exception", err);
      return notValid("errore_server");
    }
  });
