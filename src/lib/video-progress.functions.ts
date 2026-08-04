import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pukSchema = z.string().min(1);
const moduleKeySchema = z.string().min(1);

/**
 * Segna un modulo video come completato per un PUK specifico.
 * Tabella dedicata e isolata (public.video_progress) — nessuna dipendenza
 * da public.users/course_progress/auth.users, nessun rischio di rompere
 * certificati o consenso già funzionanti.
 * Non lancia mai eccezioni verso il chiamante: un fallimento qui non deve
 * mai bloccare la UI (il localStorage resta comunque la fonte di verità
 * immediata per lo sblocco sequenziale).
 */
export const markVideoCompleted = createServerFn({ method: "POST" })
  .inputValidator((input: { puk: string; moduleKey: string }) =>
    z.object({ puk: pukSchema, moduleKey: moduleKeySchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; error?: string }> => {
    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );
      const { error } = await supabaseExternal
        .from("video_progress" as never)
        .upsert(
          {
            puk_code: data.puk,
            module_key: data.moduleKey,
            completed: true,
            completed_at: new Date().toISOString(),
          } as never,
          { onConflict: "puk_code,module_key" },
        );
      if (error) {
        console.error("markVideoCompleted error:", error);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    } catch (err) {
      console.error("markVideoCompleted exception:", err);
      return { ok: false, error: err instanceof Error ? err.message : "errore sconosciuto" };
    }
  });

/**
 * Restituisce l'elenco dei module_key già completati per un PUK.
 * Usata all'apertura di /corso per allineare lo stato server con quello
 * (eventualmente assente, es. nuovo browser) del localStorage.
 */
export const getVideoProgress = createServerFn({ method: "POST" })
  .inputValidator((input: { puk: string }) =>
    z.object({ puk: pukSchema }).parse(input),
  )
  .handler(async ({ data }): Promise<{ completedModules: string[] }> => {
    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );
      const { data: rows, error } = await supabaseExternal
        .from("video_progress" as never)
        .select("module_key")
        .eq("puk_code", data.puk)
        .eq("completed", true);
      if (error) {
        console.error("getVideoProgress error:", error);
        return { completedModules: [] };
      }
      return {
        completedModules: (rows ?? []).map((r: { module_key: string }) => r.module_key),
      };
    } catch (err) {
      console.error("getVideoProgress exception:", err);
      return { completedModules: [] };
    }
  });
