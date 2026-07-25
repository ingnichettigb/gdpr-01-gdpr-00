import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { verifyAndActivateLicense, type ActivationReason } from "@/lib/license.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/attivazione")({
  head: () => ({ meta: [{ title: "Attivazione licenza — Area Corsi" }] }),
  component: AttivazionePage,
});

const MESSAGES: Record<ActivationReason, string> = {
  email_not_verified: "Devi prima verificare l'email. (E-001)",
  license_not_found:
    "Il codice licenza inserito non risulta valido. Verifica di averlo copiato correttamente dall'email di acquisto. (E-101)",
  email_mismatch:
    "Questo codice licenza è associato a un altro indirizzo email. Verifica di aver usato l'email con cui hai effettuato l'acquisto. (E-102)",
  license_expired:
    "Questa licenza risulta scaduta. Contattaci per il rinnovo. (E-103)",
  puk_not_found:
    "Il codice PUK inserito non è valido per questa licenza. Verifica di averlo copiato correttamente dall'email di acquisto. (E-201)",
  puk_already_used:
    "Questo codice PUK risulta già utilizzato. Se hai già attivato la licenza in precedenza, contattaci per assistenza. (E-202)",
  server_error:
    "Si è verificato un errore tecnico. Riprova tra qualche minuto o contattaci indicando il codice errore. (E-500)",
};

function AttivazionePage() {
  const navigate = useNavigate();
  const activateFn = useServerFn(verifyAndActivateLicense);
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [puk, setPuk] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const verified = sessionStorage.getItem("verified_email");
    if (!verified) {
      navigate({ to: "/auth" });
      return;
    }
    setEmail(verified);
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !licenseKey.trim() || !puk.trim()) {
      setError("Inserisci sia il codice licenza sia il codice PUK.");
      return;
    }
    setLoading(true);
    const result = await activateFn({ data: { email, licenseKey, puk } });
    setLoading(false);

    if (!result.ok) {
      if (result.reason === "email_not_verified") {
        navigate({ to: "/auth" });
        return;
      }
      setError(MESSAGES[result.reason]);
      return;
    }

    try {
      sessionStorage.setItem(
        "activation",
        JSON.stringify({
          licenseId: result.licenseId,
          licenseKey: result.licenseKey,
        }),
      );
    } catch {
      // ignore
    }
    navigate({ to: "/dati-attestato" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">
            Passaggio 2 di 3 — Attiva la tua licenza
          </CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Inserisci il <strong>codice licenza</strong> e il <strong>codice PUK</strong>{" "}
            che hai ricevuto via email al momento dell'acquisto.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Email verificata</Label>
              <Input value={email} disabled readOnly />
            </div>
            <div className="space-y-2">
              <Label htmlFor="licenseKey">Codice licenza</Label>
              <Input
                id="licenseKey"
                required
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                disabled={loading}
                placeholder="Es. LIC-XXXX-XXXX"
                autoComplete="off"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="puk">Codice PUK</Label>
              <Input
                id="puk"
                required
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
                "Verifica e attiva"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
