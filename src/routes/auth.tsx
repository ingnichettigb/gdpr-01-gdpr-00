import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { requestOtp } from "@/lib/otp.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail } from "lucide-react";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Verifica email — Area Corsi" },
      {
        name: "description",
        content:
          "Passaggio 1 di 3: verifichiamo che tu sia il proprietario della casella email.",
      },
    ],
  }),
  component: AuthStep1,
});

function AuthStep1() {
  const navigate = useNavigate();
  const requestOtpFn = useServerFn(requestOtp);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("Impossibile inviare il codice. Verifica l'indirizzo email. (E-010)");
      return;
    }
    setLoading(true);
    const result = await requestOtpFn({ data: { email: cleanEmail } });
    setLoading(false);
    if (!result.sent) {
      if (result.rateLimited) {
        setError("Troppi invii ravvicinati. Riprova tra qualche minuto. (E-011)");
      } else {
        setError("Impossibile inviare il codice. Verifica l'indirizzo email. (E-010)");
      }
      return;
    }
    sessionStorage.setItem("accesso_email", cleanEmail);
    navigate({ to: "/auth/verifica" });
  }


  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-center">Passaggio 1 di 3 — Verifica email</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            Verifichiamo che tu sia effettivamente il proprietario della casella
            di posta. Ti invieremo un codice a 6 cifre da inserire nella
            schermata successiva.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.it"
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
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Invio in corso…
                </>
              ) : (
                "Invia codice"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
