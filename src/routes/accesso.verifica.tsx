import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/accesso/verifica")({
  head: () => ({ meta: [{ title: "Verifica codice — Area Corsi" }] }),
  component: AccessoStep2,
});

function AccessoStep2() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const e = sessionStorage.getItem("accesso_email");
    if (!e) {
      navigate({ to: "/accesso" });
      return;
    }
    setEmail(e);
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(token)) {
      setError("Il codice deve essere di 6 cifre.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Codice non valido o scaduto.");
      return;
    }
    navigate({ to: "/accesso/attiva" });
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
              <Link to="/accesso" className="underline">
                Cambia indirizzo
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
