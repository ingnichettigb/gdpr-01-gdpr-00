import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { isLessonCompleted } from "@/components/VideoLesson";
import { supabaseExternal } from "@/integrations/supabase/client.external";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Test finale — Corso Privacy per Incaricati" },
      {
        name: "description",
        content: "Test finale a scelta multipla del corso privacy per incaricati.",
      },
    ],
  }),
  component: TestPage,
});

type Question = {
  id: string;
  text: string;
  options: { key: string; label: string }[];
  correct: string;
};

const QUESTIONS: Question[] = [
  {
    id: "q1",
    text: "Qual è il compito principale dell'incaricato del trattamento?",
    options: [
      { key: "A", label: "Decidere finalità e mezzi del trattamento" },
      { key: "B", label: "Eseguire le istruzioni del titolare" },
      { key: "C", label: "Vendere i dati a terzi" },
      { key: "D", label: "Conservare i dati per sempre" },
    ],
    correct: "B",
  },
  {
    id: "q2",
    text: "Quale di queste azioni è vietata all'incaricato?",
    options: [
      { key: "A", label: "Accedere ai dati solo per motivi di servizio" },
      { key: "B", label: "Seguire le istruzioni del titolare" },
      { key: "C", label: "Condividere dati personali con colleghi non autorizzati" },
      { key: "D", label: "Segnalare anomalie al DPO" },
    ],
    correct: "C",
  },
  {
    id: "q3",
    text: "Cosa deve fare l'incaricato in caso di possibile violazione dei dati?",
    options: [
      { key: "A", label: "Ignorare l'evento" },
      { key: "B", label: "Risolvere da solo il problema" },
      { key: "C", label: "Segnalare immediatamente al titolare o al DPO" },
      { key: "D", label: "Eliminare i dati coinvolti" },
    ],
    correct: "C",
  },
];

const PASS_THRESHOLD = 2;

function TestPage() {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = isLessonCompleted("lezione1") && isLessonCompleted("lezione2");
      // Blocca se questo PUK ha già generato un certificato
      try {
        const raw = sessionStorage.getItem("activation");
        const act = raw ? JSON.parse(raw) : null;
        if (act?.puk) {
          const { data: cert } = await supabaseExternal
            .from("certificates")
            .select("id")
            .eq("puk_code", act.puk)
            .maybeSingle();
          if (cert) {
            navigate({ to: "/corso-gia-completato" });
            return;
          }
        }
      } catch (err) {
        console.error("cert check error", err);
      }
      setAllowed(ok);
    })();
  }, [navigate]);

  const score = useMemo(
    () => QUESTIONS.reduce((s, q) => (answers[q.id] === q.correct ? s + 1 : s), 0),
    [answers],
  );
  const passed = score >= PASS_THRESHOLD;
  const allAnswered = QUESTIONS.every((q) => answers[q.id]);

  if (allowed === null) return null;

  if (!allowed) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="max-w-md text-center space-y-4">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive" />
          <h1 className="text-2xl font-bold">Accesso non consentito</h1>
          <p className="text-muted-foreground">
            Per accedere al test devi prima completare la visione di entrambi i video.
          </p>
          <Button onClick={() => navigate({ to: "/" })}>Torna ai video</Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Test finale</h1>
          <p className="text-muted-foreground mt-2">
            Rispondi alle 3 domande. Soglia di superamento: {PASS_THRESHOLD}/3.
          </p>
        </header>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setSubmitted(true);
            const finalScore = QUESTIONS.reduce(
              (s, q) => (answers[q.id] === q.correct ? s + 1 : s),
              0,
            );
            if (finalScore >= PASS_THRESHOLD) {
              localStorage.setItem("test_passed", "true");
              if (!localStorage.getItem("attestato_cert_number")) {
                const d = new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                const cert = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
                localStorage.setItem("attestato_cert_number", cert);

                // Persist certificate to Supabase (immutable record)
                try {
                  const raw = localStorage.getItem("attestato_data");
                  const a = raw ? JSON.parse(raw) : null;
                  if (a && a.licenseId) {
                    const { data: inserted, error: insErr } = await supabase
                      .from("certificates")
                      .insert({
                        certificate_number: cert,
                        license_id: a.licenseId,
                        license_key: a.licenseKey ?? null,
                        puk_code: a.puk ?? null,
                        nome_snapshot: a.nome ?? null,
                        cf_snapshot: (a.cf ?? "").toUpperCase() || null,
                        ditta_snapshot: a.ditta ?? null,
                        luogo_nascita_snapshot: a.luogo || null,
                        data_nascita_snapshot: a.dataNascita || null,
                        test_score: finalScore,
                        test_result: "passed",
                      })
                      .select("id, issued_at")
                      .single();
                    if (insErr) {
                      console.error("Errore salvataggio certificato:", insErr);
                    } else if (inserted) {
                      localStorage.setItem(
                        "attestato_cert_id",
                        inserted.id,
                      );
                      localStorage.setItem(
                        "attestato_issued_at",
                        inserted.issued_at,
                      );
                    }
                  }
                } catch (err) {
                  console.error("Eccezione durante salvataggio:", err);
                }
              }
            }
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className="space-y-6"
        >
          {QUESTIONS.map((q, i) => {
            const userAnswer = answers[q.id];
            const isCorrect = submitted && userAnswer === q.correct;
            const isWrong = submitted && userAnswer && userAnswer !== q.correct;

            return (
              <div key={q.id} className="rounded-xl border bg-card p-6 space-y-4">
                <div className="flex items-start gap-3">
                  <span className="font-semibold text-muted-foreground">{i + 1}.</span>
                  <h2 className="font-semibold">{q.text}</h2>
                </div>

                <RadioGroup
                  value={userAnswer ?? ""}
                  onValueChange={(v) =>
                    !submitted && setAnswers((a) => ({ ...a, [q.id]: v }))
                  }
                  className="pl-7"
                >
                  {q.options.map((opt) => {
                    const id = `${q.id}-${opt.key}`;
                    const isThisCorrect = submitted && opt.key === q.correct;
                    const isThisWrong =
                      submitted && userAnswer === opt.key && opt.key !== q.correct;
                    return (
                      <div
                        key={opt.key}
                        className={`flex items-center gap-3 rounded-md p-2 ${
                          isThisCorrect
                            ? "bg-green-50 dark:bg-green-950/30"
                            : isThisWrong
                              ? "bg-red-50 dark:bg-red-950/30"
                              : ""
                        }`}
                      >
                        <RadioGroupItem
                          value={opt.key}
                          id={id}
                          disabled={submitted}
                        />
                        <Label htmlFor={id} className="cursor-pointer flex-1">
                          <span className="font-medium mr-2">{opt.key})</span>
                          {opt.label}
                        </Label>
                      </div>
                    );
                  })}
                </RadioGroup>

                {submitted && (
                  <div
                    className={`flex items-center gap-2 text-sm pl-7 ${
                      isCorrect ? "text-green-600" : "text-destructive"
                    }`}
                  >
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-4 w-4" /> Risposta corretta
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4" /> Risposta errata — corretta:{" "}
                        {q.correct}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {!submitted ? (
            <div className="flex justify-end">
              <Button type="submit" disabled={!allAnswered}>
                Invia risposte
              </Button>
            </div>
          ) : (
            <div
              className={`rounded-xl border p-6 text-center space-y-3 ${
                passed
                  ? "bg-green-50 dark:bg-green-950/30 border-green-200"
                  : "bg-red-50 dark:bg-red-950/30 border-red-200"
              }`}
            >
              <h3 className="text-2xl font-bold">
                Punteggio: {score} / {QUESTIONS.length}
              </h3>
              <p className={passed ? "text-green-700" : "text-destructive"}>
                {passed
                  ? "Complimenti, hai superato il test!"
                  : `Non hai raggiunto la soglia minima (${PASS_THRESHOLD}/3). Riprova.`}
              </p>
              <div className="flex justify-center gap-3 flex-wrap">
                {passed ? (
                  <Button asChild>
                    <Link to="/attestato">Scarica il tuo attestato</Link>
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAnswers({});
                        setSubmitted(false);
                      }}
                    >
                      Riprova
                    </Button>
                    <Button asChild>
                      <Link to="/corso">Torna ai video</Link>
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </main>
  );
}
