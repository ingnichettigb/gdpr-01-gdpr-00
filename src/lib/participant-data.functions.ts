import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const pukSchema = z.object({ puk: z.string().min(1) });

const saveSchema = z.object({
  puk: z.string().min(1),
  nome: z.string().min(1),
  luogo: z.string().optional().default(""),
  dataNascita: z.string().optional().default(""),
  cf: z.string().min(1),
  ditta: z.string().min(1),
});

export type ParticipantData = {
  nome: string;
  luogo: string;
  dataNascita: string;
  cf: string;
  ditta: string;
} | null;

/**
 * Legge i dati anagrafici già salvati per questo PUK, se esistono.
 * Fonte di verità server-side per il recupero cross-browser di
 * /dati-attestato, prima ancora che il certificato sia generato — vedi
 * docs/migration_participant_data.sql.
 */
export const getParticipantData = createServerFn({ method: "POST" })
  .validator(pukSchema)
  .handler(async ({ data }): Promise<ParticipantData> => {
    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );
      const { data: row, error } = await supabaseExternal
        .from("participant_data")
        .select("nome, luogo_nascita, data_nascita, cf, ditta")
        .eq("puk_code", data.puk)
        .maybeSingle();

      if (error) {
        console.error("getParticipantData error", error);
        return null;
      }
      if (!row) return null;

      return {
        nome: (row.nome as string) ?? "",
        luogo: (row.luogo_nascita as string | null) ?? "",
        dataNascita: (row.data_nascita as string | null) ?? "",
        cf: (row.cf as string) ?? "",
        ditta: (row.ditta as string) ?? "",
      };
    } catch (err) {
      console.error("getParticipantData exception", err);
      return null;
    }
  });

/** Salva (o aggiorna) i dati anagrafici per questo PUK. */
export const saveParticipantData = createServerFn({ method: "POST" })
  .validator(saveSchema)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    try {
      const { supabaseExternal } = await import(
        "@/integrations/supabase/client.external"
      );
      const { error } = await supabaseExternal.from("participant_data").upsert(
        {
          puk_code: data.puk,
          nome: data.nome,
          luogo_nascita: data.luogo || null,
          data_nascita: data.dataNascita || null,
          cf: data.cf,
          ditta: data.ditta,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "puk_code" },
      );

      if (error) {
        console.error("saveParticipantData error", error);
        return { ok: false };
      }
      return { ok: true };
    } catch (err) {
      console.error("saveParticipantData exception", err);
      return { ok: false };
    }
  });
