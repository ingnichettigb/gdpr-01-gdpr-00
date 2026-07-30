import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { isLessonCompleted } from "@/components/VideoLesson";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Lock,
  PlayCircle,
  FileText,
  ListChecks,
  Award,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Area Formazione — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Dashboard del corso privacy per incaricati. Accedi ai moduli video e al test finale.",
      },
    ],
  }),
  component: HomePage,
});

const STORAGE_KEY = "attestato_data";

function HomePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<"loading" | "landing" | "dashboard">("loading");

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const signedIn = Boolean(data.user?.email);
      let hasAttestato = false;
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          hasAttestato = Boolean(
            parsed?.nome && parsed?.cf && parsed?.ditta && parsed?.licenseId,
          );
        }
      } catch {
        // ignore
      }
      if (signedIn && hasAttestato) {
        setState("dashboard");
      } else {
        setState("landing");
      }
    })();
  }, [navigate]);

  if (state === "loading") return null;
  if (state === "landing") return <Landing />;
  return <Dashboard />;
}

function Landing() {
  const prussian = "#003153";
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{ color: prussian, backgroundColor: "#f6f6f7" }}
    >
      <div className="max-w-xl w-full space-y-6 text-center">
        <Award className="h-14 w-14 mx-auto text-primary" />
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
          Corso My Privacy
        </h1>
        <p className="text-base sm:text-lg" style={{ opacity: 0.85 }}>
          Attivazione in 3 passaggi:
        </p>
        <ol className="text-left mx-auto max-w-md space-y-2 text-sm sm:text-base">
          <li>
            <strong>1.</strong> Verifica la tua email con un codice a 6 cifre.
          </li>
          <li>
            <strong>2.</strong> Inserisci codice licenza e PUK ricevuti via email.
          </li>
          <li>
            <strong>3.</strong> Compila i dati per l'attestato e accedi al corso.
          </li>
        </ol>
        <Button
          asChild
          size="lg"
          style={{ backgroundColor: prussian, color: "#fff" }}
        >
          <Link to="/auth">Inizia</Link>
        </Button>
      </div>
    </main>
  );
}

function Dashboard() {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);

  useEffect(() => {
    setC1(isLessonCompleted("lezione1"));
    setC2(isLessonCompleted("lezione2"));
  }, []);

  const allDone = c1 && c2;

  const prussian = "#003153";
  return (
    <main className="min-h-screen bg-background py-10 px-4" style={{ color: prussian }}>
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: prussian }}>
            Corso Privacy per Incaricati
          </h1>
          <h2 className="text-xl sm:text-2xl font-bold italic" style={{ color: prussian }}>
            Guida Pratica per l'Addetto e l'Incaricato
          </h2>
          <p className="max-w-2xl mx-auto" style={{ color: prussian, opacity: 0.85 }}>
            Benvenuto nel modulo formativo. Segui i passaggi sottostanti: guarda i video
            in ordine, senza saltare, e completa il test finale per ottenere l'attestato.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" style={{ backgroundColor: prussian, color: "#fff" }}>
              <Link to="/corso">
                {c1 || c2 ? "Continua il corso" : "Inizia il corso"}
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircle className="h-5 w-5 text-primary" />
                Modulo 1
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Guida Pratica per l'Addetto e l'Incaricato.
              </p>
              <div className="flex items-center justify-between">
                {c1 ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completato
                  </Badge>
                ) : (
                  <Badge variant="secondary">Da iniziare</Badge>
                )}
                <span className="text-xs text-muted-foreground">Video</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <PlayCircle className="h-5 w-5 text-primary" />
                Modulo 2
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Privacy come processo continuo.
              </p>
              <div className="flex items-center justify-between">
                {c2 ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Completato
                  </Badge>
                ) : c1 ? (
                  <Badge variant="secondary">Disponibile</Badge>
                ) : (
                  <Badge variant="outline" className="opacity-70">
                    <Lock className="h-3 w-3 mr-1" /> Bloccato
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Video</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Test finale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                3 domande a scelta multipla. Soglia 2/3.
              </p>
              <div className="flex items-center justify-between">
                {allDone ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Sbloccato
                  </Badge>
                ) : (
                  <Badge variant="outline" className="opacity-70">
                    <Lock className="h-3 w-3 mr-1" /> Bloccato
                  </Badge>
                )}
                <span className="text-xs text-muted-foreground">Quiz</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="rounded-xl border bg-card p-6 sm:p-8 space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            Come usufruire del corso
          </h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>
              Clicca su <strong className="text-foreground">"Inizia il corso"</strong> per aprire la pagina dei video.
            </li>
            <li>
              Guarda il <strong className="text-foreground">Modulo 1</strong> dall'inizio alla fine: il sistema salva automaticamente il punto in cui ti fermi.
            </li>
            <li>
              Una volta completato il primo video, si sblocca il <strong className="text-foreground">Modulo 2</strong>.
            </li>
            <li>
              Dopo aver visto entrambi i video, il <strong className="text-foreground">Test finale</strong> si sblocca. Rispondi alle 3 domande: devi totalizzare almeno 2 risposte corrette per superarlo.
            </li>
            <li>
              Se non superi il test al primo tentativo, puoi <strong className="text-foreground">riprovare</strong> fino al raggiungimento del punteggio minimo.
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
