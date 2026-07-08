import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { verifyOtp } from "@/lib/otp.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";


export const Route = createFileRoute("/auth/verifica")({
  head: () => ({ meta: [{ title: "Verifica codice — Area Corsi" }] }),
  component: AuthStep2,
});

function AuthStep2() {
  const navigate = useNavigate();
  const verifyOtpFn = useServerFn(verifyOtp);
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const e = sessionStorage.getItem("accesso_email");
    if (!e) {
      navigate({ to: "/auth" });
      return;
    }
    setEmail(e);
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(token)) {
      setError("Codice non corretto o scaduto. Riprova o richiedi un nuovo invio. (E-012)");
      return;
    }
    setLoading(true);
    const result = await verifyOtpFn({ data: { email, code: token } });
    setLoading(false);
    if (!result.ok) {
      if (result.reason === "expired") {
        setError("Codice scaduto. Richiedi un nuovo invio. (E-012)");
      } else {
        setError("Codice non corretto. Riprova o richiedi un nuovo invio. (E-012)");
      }
      return;
    }
    sessionStorage.setItem("verified_email", email);
    navigate({ to: "/attivazione" });
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Inserisci il codice</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Abbiamo inviato un codice a 6 cifre a <strong>{email}</strong>.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">Codice OTP</Label>
              <Input
                id="otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                required
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ""))}
                placeholder="123456"
                className="text-center text-2xl tracking-[0.5em]"
                disabled={loading}
              />
            </div>
            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" disabled={loading || token.length !== 6}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifica…
                </>
              ) : (
                "Verifica codice"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Email sbagliata?{" "}
              <Link to="/auth" className="underline">
                Cambia indirizzo
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
