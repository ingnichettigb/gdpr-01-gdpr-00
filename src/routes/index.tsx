import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { currentPuk } from "@/components/VideoLesson";
import { getFunnelStatus } from "@/lib/funnel-guard.functions";
import { LESSONS } from "@/lib/course-content";
import { PASS_THRESHOLD, TEST_QUESTION_COUNT } from "./test";
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

function HomePage() {
  const navigate = useNavigate();
  const getStatusFn = useServerFn(getFunnelStatus);
  const [state, setState] = useState<"loading" | "landing" | "dashboard">("loading");
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      // La dashboard si mostra SOLO se esiste un PUK risolvibile e
      // rivalidato adesso col server (licenza attiva, PUK non scaduto).
      // Prima si controllava solo un userId residuo in localStorage, senza
      // nessuna verifica: su un browser condiviso chiunque vedeva la
      // dashboard (e il corso) di chi aveva usato quel browser prima
      // (bug di sicurezza corretto qui).
      const puk = currentPuk();
      if (puk === "no-puk") {
        setState("landing");
        return;
      }
      try {
        const status = await getStatusFn({ data: { puk } });
        if (!status.valid) {
          setState("landing");
          return;
        }
        if (status.certified) {
          // Corso già completato: non ha senso mostrare la dashboard con
          // "Vai al corso" e tutti i moduli segnati completati — si va
          // dritti alla schermata di scelta (vedi attestato / nuova
          // licenza), stessa destinazione di corso.tsx/test.tsx/attivazione.tsx.
          navigate({ to: "/corso-gia-completato" });
          return;
        }
        setCompletedModules(status.completedModules);
        setState("dashboard");
      } catch (err) {
        console.error("getFunnelStatus error", err);
        setState("landing");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") return null;
  if (state === "landing") return <Landing />;
  return <Dashboard completedModules={completedModules} />;
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

function Dashboard({ completedModules }: { completedModules: string[] }) {
  const isDone = (key: string) => completedModules.includes(key);
  const allDone = LESSONS.every((l) => isDone(l.key));

  const prussian = "#003153";
  return (
    <main className="min-h-screen bg-background py-10 px-4" style={{ color: prussian }}>
      <div className="max-w-4xl mx-auto space-y-10">
        <header className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight" style={{ color: prussian }}>
            Corso My Privacy
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
                Vai al corso
              </Link>
            </Button>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-3">
          {LESSONS.map((l, i) => {
            const done = isDone(l.key);
            const unlocked = i === 0 || isDone(LESSONS[i - 1]!.key);
            return (
              <Card key={l.key}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PlayCircle className="h-5 w-5 text-primary" />
                    Modulo {i + 1}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground truncate" title={l.title}>
                    {l.title.replace(/^Modulo \d+ — /, "")}
                  </p>
                  <div className="flex items-center justify-between">
                    {done ? (
                      <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Completato
                      </Badge>
                    ) : unlocked ? (
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
            );
          })}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Test finale
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                {TEST_QUESTION_COUNT} domande a scelta multipla. Soglia {PASS_THRESHOLD}/{TEST_QUESTION_COUNT}.
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
              Clicca su <strong className="text-foreground">"Vai al corso"</strong> per aprire la pagina dei video.
            </li>
            <li>
              Guarda i <strong className="text-foreground">{LESSONS.length} moduli</strong> in ordine, dall'inizio alla fine: il sistema salva automaticamente il punto in cui ti fermi, e potrai sempre tornare a rivedere un modulo già completato.
            </li>
            <li>
              Ogni modulo si sblocca solo dopo aver completato quello precedente.
            </li>
            <li>
              Dopo aver visto tutti i moduli, il <strong className="text-foreground">Test finale</strong> si sblocca. Rispondi alle {TEST_QUESTION_COUNT} domande: devi totalizzare almeno {PASS_THRESHOLD} risposte corrette per superarlo.
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
