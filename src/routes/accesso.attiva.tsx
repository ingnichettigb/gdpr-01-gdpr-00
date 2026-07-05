import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/accesso/attiva")({
  head: () => ({ meta: [{ title: "Attiva PUK — Area Corsi" }] }),
  component: AccessoAttivaPage,
});

function AccessoAttivaPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [puk, setPuk] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        navigate({ to: "/accesso" });
        return;
      }
      setEmail(data.user.email ?? "");
      setUserId(data.user.id);
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const code = puk.trim();
    if (!code) {
      setError("Inserisci il codice PUK.");
      return;
    }
    if (!userId) {
      setError("Sessione non valida. Riprova dall'inizio.");
      return;
    }

    setLoading(true);
    const nowIso = new Date().toISOString();

    // 1. Verifica PUK
    const { data: pukRow, error: pukErr } = await supabase
      .from("puk_codes")
      .select("id, used, expires_at")
      .eq("code", code)
      .maybeSingle();

    if (pukErr || !pukRow || pukRow.used || (pukRow.expires_at && pukRow.expires_at < nowIso)) {
      setLoading(false);
      setError("Codice non valido, già utilizzato o scaduto.");
      return;
    }

    // 2. Recupera license_id dal mapping
    const { data: map, error: mapErr } = await supabase
      .from("license_puk_map")
      .select("license_id")
      .eq("puk_id", pukRow.id)
      .maybeSingle();

    if (mapErr || !map?.license_id) {
      setLoading(false);
      setError("Nessuna licenza collegata a questo PUK.");
      return;
    }

    // 3. Verifica licenza
    const { data: lic, error: licErr } = await supabase
      .from("licenses")
      .select("id, is_active, expires_at, user_email, license_key")
      .eq("id", map.license_id)
      .maybeSingle();

    if (
      licErr ||
      !lic ||
      lic.is_active !== true ||
      (lic.expires_at && lic.expires_at < nowIso)
    ) {
      setLoading(false);
      setError("La licenza collegata a questo PUK non è attiva o è scaduta.");
      return;
    }

    // 4. Attivazione PUK (anti-race: used=false nel WHERE)
    const { data: updatedPuk, error: pukUpdErr } = await supabase
      .from("puk_codes")
      .update({ used: true, used_at: nowIso, user_id: userId })
      .eq("id", pukRow.id)
      .eq("used", false)
      .select("id");

    if (pukUpdErr || !updatedPuk || updatedPuk.length === 0) {
      setLoading(false);
      setError("Codice PUK appena utilizzato da un'altra sessione. Riprova con un altro codice.");
      return;
    }

    // 5. Assegna email alla licenza se ancora libera
    await supabase
      .from("licenses")
      .update({ user_email: email })
      .eq("id", lic.id)
      .is("user_email", null);

    // 6. Upsert utente
    await supabase.from("users").upsert(
      { id: userId, email, name: email },
      { onConflict: "id" },
    );

    // 7. Prefill onboarding con la licenza attivata
    try {
      localStorage.setItem(
        "attestato_prefill",
        JSON.stringify({ licenseKey: lic.license_key ?? "", licenseId: lic.id }),
      );
    } catch {
      // ignore
    }

    setLoading(false);
    navigate({ to: "/" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Attiva il tuo PUK</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Inserisci il codice PUK ricevuto per sbloccare il corso.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email verificata</Label>
              <Input value={email} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="puk">Codice PUK</Label>
              <Input
                id="puk"
                required
                autoFocus
                value={puk}
                onChange={(e) => setPuk(e.target.value)}
                disabled={loading}
                placeholder="Inserisci il codice PUK"
                autoComplete="off"
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifica in corso…
                </>
              ) : (
                "Attiva PUK"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
