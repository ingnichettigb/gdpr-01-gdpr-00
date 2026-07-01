import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";

export const Route = createFileRoute("/accesso/attiva")({
  head: () => ({ meta: [{ title: "Attiva accesso — Area Corsi" }] }),
  component: AccessoStep3,
});

function AccessoStep3() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    ditta: "",
    cognome: "",
    nome: "",
    license_key: "",
    puk_code: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bypassClicks, setBypassClicks] = useState(0);

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

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!form.ditta.trim() || !form.cognome.trim() || !form.nome.trim()) {
      setError("Compila ditta, cognome e nome.");
      return;
    }
    if (!form.license_key.trim() || !form.puk_code.trim()) {
      setError("Inserisci codice licenza e PUK.");
      return;
    }
    if (!userId) {
      setError("Sessione non valida. Riprova dall'inizio.");
      return;
    }

    setLoading(true);

    // 1. Controllo licenza
    const nowIso = new Date().toISOString();
    const { data: lic, error: licErr } = await supabase
      .from("licenses")
      .select("id, is_active, expires_at")
      .eq("license_key", form.license_key.trim())
      .maybeSingle();

    if (licErr || !lic) {
      setLoading(false);
      setError("Codice licenza non trovato.");
      return;
    }
    if (!lic.is_active) {
      setLoading(false);
      setError("Licenza non attiva.");
      return;
    }
    if (lic.expires_at && lic.expires_at < nowIso) {
      setLoading(false);
      setError("Licenza scaduta.");
      return;
    }

    // 2. Controllo PUK
    const { data: puk, error: pukErr } = await supabase
      .from("puk_codes")
      .select("id, used, expires_at, course_id")
      .eq("code", form.puk_code.trim())
      .maybeSingle();

    if (pukErr || !puk) {
      setLoading(false);
      setError("Codice PUK non trovato.");
      return;
    }
    if (puk.used) {
      setLoading(false);
      setError("Codice PUK già utilizzato.");
      return;
    }
    if (puk.expires_at && puk.expires_at < nowIso) {
      setLoading(false);
      setError("Codice PUK scaduto.");
      return;
    }

    // 3. Controllo mapping license_puk_map
    const { data: map, error: mapErr } = await supabase
      .from("license_puk_map")
      .select("id")
      .eq("license_id", lic.id)
      .eq("puk_id", puk.id)
      .maybeSingle();

    if (mapErr || !map) {
      setLoading(false);
      setError("Licenza e PUK non sono associati.");
      return;
    }

    // 4. Attivazione: marca PUK come usato + upsert users
    const { error: pukUpdErr } = await supabase
      .from("puk_codes")
      .update({
        used: true,
        used_at: nowIso,
        user_id: userId,
      })
      .eq("id", puk.id)
      .eq("used", false); // doppia sicurezza anti race

    if (pukUpdErr) {
      setLoading(false);
      setError("Impossibile attivare il PUK. " + pukUpdErr.message);
      return;
    }

    // Upsert profilo utente (ditta + cognome + nome → name)
    const fullName = `${form.ditta.trim()} | ${form.cognome.trim()} ${form.nome.trim()}`;
    await supabase.from("users").upsert(
      {
        id: userId,
        email,
        name: fullName,
      },
      { onConflict: "id" },
    );

    // Associa email alla licenza se mancante
    await supabase
      .from("licenses")
      .update({ user_email: email })
      .eq("id", lic.id)
      .is("user_email", null);

    sessionStorage.setItem("accesso_course_id", puk.course_id ?? "");
    setLoading(false);
    navigate({ to: "/accesso/successo" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Attiva il tuo accesso</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Completa i dati e inserisci licenza + PUK per accedere al corso.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email verificata</Label>
              <Input value={email} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ditta">Ditta</Label>
              <Input
                id="ditta"
                required
                value={form.ditta}
                onChange={(e) => update("ditta", e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="cognome">Cognome</Label>
                <Input
                  id="cognome"
                  required
                  value={form.cognome}
                  onChange={(e) => update("cognome", e.target.value)}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <Input
                  id="nome"
                  required
                  value={form.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="license_key">Codice licenza</Label>
              <Input
                id="license_key"
                required
                value={form.license_key}
                onChange={(e) => update("license_key", e.target.value)}
                disabled={loading}
                placeholder="es. ABCD-1234-EFGH"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="puk_code">Codice PUK</Label>
              <Input
                id="puk_code"
                required
                value={form.puk_code}
                onChange={(e) => update("puk_code", e.target.value)}
                disabled={loading}
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
                "Attiva accesso"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
