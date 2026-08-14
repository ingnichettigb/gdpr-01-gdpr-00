import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, KeyRound } from "lucide-react";
import { verifyAndActivateLicense, type ActivationReason } from "@/lib/license.functions";
import { checkCertificateByPuk } from "@/lib/certificate.functions";
import { findActiveLicenseByEmail } from "@/lib/course.functions";
import { consumeFunnelBlockReason, funnelReasonMessage } from "@/lib/funnel-messages";

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
  const checkCertFn = useServerFn(checkCertificateByPuk);
  const findLicenseFn = useServerFn(findActiveLicenseByEmail);
  const [email, setEmail] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [puk, setPuk] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reason = consumeFunnelBlockReason();
    if (reason) {
      setError(funnelReasonMessage(reason));
      try {
        sessionStorage.setItem("skip_auto_activation", "1");
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    (async () => {
      const verified = sessionStorage.getItem("verified_email");
      if (!verified) {
        navigate({ to: "/auth" });
        return;
      }
      setEmail(verified);

      // Via di fuga: se l'utente arriva da "corso-gia-completato" con
      // l'esplicita richiesta di inserire un'altra licenza, salta la
      // scorciatoia automatica una volta sola — altrimenti chi ha già una
      // licenza certificata su questa email resterebbe bloccato in un
      // vicolo cieco, senza modo di attivarne una diversa.
      let skipShortcut = false;
      try {
        if (sessionStorage.getItem("skip_auto_activation") === "1") {
          skipShortcut = true;
          sessionStorage.removeItem("skip_auto_activation");
        }
      } catch {
        // ignore
      }
      if (skipShortcut) return;

      // Scorciatoia per chi torna con la stessa email già verificata: prima
      // NON verificava nulla (leggeva solo un userId residuo in localStorage,
      // indipendente dall'email appena inserita — bug di sicurezza corretto
      // qui). Ora risolve lato server, per QUESTA email, se esiste una
      // licenza attiva e un PUK realmente assegnato, e solo in quel caso
      // salta il form.
      try {
        const lic = await findLicenseFn({ data: { email: verified } });
        if (lic.found && lic.puk && lic.licenseId) {
          const activationPayload = {
            licenseId: lic.licenseId,
            licenseKey: lic.licenseKey ?? "",
            puk: lic.puk,
          };
          try {
            sessionStorage.setItem("activation", JSON.stringify(activationPayload));
            localStorage.setItem("lastActivation", JSON.stringify(activationPayload));
          } catch {
            // ignore
          }
          try {
            const cert = await checkCertFn({ data: { puk: lic.puk } });
            navigate({ to: cert ? "/corso-gia-completato" : "/termini" });
          } catch (err) {
            console.error("cert check error", err);
            navigate({ to: "/termini" });
          }
        }
      } catch (err) {
        console.error("license lookup error", err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Precompila licenza/PUK se arrivati dal link diretto nell'email
  // (es. ?licenza=TEST-...&puk=PUK-...), cosi' l'utente non deve copiare
  // niente a mano.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const licenzaParam = params.get("licenza");
    const pukParam = params.get("puk");
    if (licenzaParam) setLicenseKey(licenzaParam.toUpperCase());
    if (pukParam) setPuk(pukParam.toUpperCase());
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!email || !licenseKey.trim() || !puk.trim()) {
      setError("Inserisci sia il codice licenza sia il codice PUK.");
      return;
    }
    setLoading(true);
    let result: Awaited<ReturnType<typeof activateFn>>;
    try {
      result = await activateFn({ data: { email, licenseKey, puk } });
    } catch (err) {
      console.error("verifyAndActivateLicense exception", err);
      setLoading(false);
      setError(
        "Si è verificato un errore tecnico durante l'attivazione. Riprova tra qualche minuto o contattaci. (E-500)",
      );
      return;
    }
    setLoading(false);

    if (!result.ok) {
      // Prima qui, per il solo caso "email non verificata", si veniva
      // rimandati in silenzio a /auth senza alcun messaggio: causa diretta
      // del loop invisibile riscontrato (E-001 non veniva mai mostrato).
      // Ora mostriamo sempre il motivo, per ogni caso.
      setError(MESSAGES[result.reason]);
      return;
    }

    // Salva il riferimento all'attivazione (sessionStorage per la sessione corrente,
    // localStorage come fallback comodo per rientrare da un browser diverso senza
    // dover rifare l'attivazione ogni volta). Va fatto SEMPRE, prima di qualsiasi
    // redirect, altrimenti /attestato non trova il PUK da cercare su Supabase.
    const activationPayload = {
      licenseId: result.licenseId,
      licenseKey: result.licenseKey,
      puk: result.puk,
      userId: result.userId,
    };
    try {
      sessionStorage.setItem("activation", JSON.stringify(activationPayload));
      localStorage.setItem("lastActivation", JSON.stringify(activationPayload));
    } catch {
      // ignore
    }

    // Se questo PUK ha già generato un certificato, porta alla schermata di
    // scelta (vedi certificato / attiva un'altra licenza), non direttamente
    // al certificato: l'utente deve poter scegliere, non ritrovarselo aperto
    // senza altre opzioni visibili.
    try {
      const cert = await checkCertFn({ data: { puk: result.puk } });
      if (cert) {
        navigate({ to: "/corso-gia-completato" });
        return;
      }
    } catch (err) {
      console.error("cert check error", err);
    }

    navigate({ to: "/termini" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <KeyRound className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">
            Passaggio 2 di 4 — Attiva la tua licenza
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
              <div className="rounded-md bg-destructive/10 px-3 py-2 space-y-2">
                <p className="text-sm text-destructive">{error}</p>
                {error === MESSAGES.email_not_verified && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate({ to: "/auth" })}
                  >
                    Verifica di nuovo l'email
                  </Button>
                )}
              </div>
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
