import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { currentPuk } from "@/components/VideoLesson";
import { saveCertificate } from "@/lib/certificate.functions";
import { getFunnelStatus } from "@/lib/funnel-guard.functions";
import { getParticipantData } from "@/lib/participant-data.functions";

export const Route = createFileRoute("/test")({
  head: () => ({
    meta: [
      { title: "Test finale — Corso My Privacy" },
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
  const saveCertFn = useServerFn(saveCertificate);
  const getStatusFn = useServerFn(getFunnelStatus);
  const getParticipantFn = useServerFn(getParticipantData);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    (async () => {
      const puk = currentPuk();
      if (puk === "no-puk") {
        navigate({ to: "/attivazione" });
        return;
      }
      try {
        const status = await getStatusFn({ data: { puk } });
        if (!status.valid) {
          // PUK/licenza non valida o non piu' attiva: niente accesso al test,
          // qualunque cosa dica localStorage.
          navigate({ to: "/attivazione" });
          return;
        }
        if (status.certified) {
          navigate({ to: "/corso-gia-completato" });
          return;
        }
        setAllowed(status.module1 && status.module2);
      } catch (err) {
        console.error("getFunnelStatus error", err);
        // Il server non ha potuto confermare: non si concede l'accesso.
        setAllowed(false);
      }
    })();
  }, [navigate, getStatusFn]);

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
              // Il PUK di riferimento è SEMPRE quello della sessione reale
              // (currentPuk, già rivalidato dal gate all'inizio di questa
              // pagina), mai quello letto da attestato_data: su un browser
              // già usato da un'altra persona, attestato_data potrebbe
              // appartenere a un PUK diverso — usarlo per decidere "di chi è
              // il certificato" avrebbe potuto salvarlo sulla persona
              // sbagliata, con il nome sbagliato.
              const currentPukForCert: string = currentPuk();
              const certKey = `attestato_cert_number_${currentPukForCert}`;

              localStorage.setItem("test_passed", "true");
              localStorage.setItem(`test_passed_${currentPukForCert}`, "true");

              if (!localStorage.getItem(certKey) && currentPukForCert !== "no-puk") {
                const d = new Date();
                const pad = (n: number) => String(n).padStart(2, "0");
                const pukSuffix = currentPukForCert
                  .replace(/[^A-Za-z0-9]/g, "")
                  .slice(-5)
                  .toUpperCase();
                const cert = `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}-${pukSuffix}`;
                localStorage.setItem(certKey, cert);

                // Persist certificate to Supabase (immutable record)
                try {
                  const rawData = localStorage.getItem("attestato_data");
                  const parsedData = rawData ? JSON.parse(rawData) : null;
                  let a: {
                    licenseId?: string;
                    licenseKey?: string;
                    puk?: string;
                    nome?: string;
                    cf?: string;
                    ditta?: string;
                    luogo?: string;
                    dataNascita?: string;
                  } | null = parsedData?.puk === currentPukForCert ? parsedData : null;

                  if (!a) {
                    // attestato_data assente o di un altro PUK: licenseId/
                    // licenseKey vengono dalla sessione (fonte affidabile),
                    // i dati anagrafici dal server (participant_data), MAI
                    // da localStorage se non è già stato verificato che
                    // appartiene a questo PUK.
                    let identity: { licenseId?: string; licenseKey?: string; puk?: string } | null = null;
                    try {
                      const raw =
                        sessionStorage.getItem("activation") ?? localStorage.getItem("lastActivation");
                      const parsed = raw ? JSON.parse(raw) : null;
                      if (parsed?.puk === currentPukForCert) identity = parsed;
                    } catch {
                      // ignore
                    }
                    if (identity) {
                      try {
                        const remote = await getParticipantFn({ data: { puk: currentPukForCert } });
                        if (remote) a = { ...identity, ...remote };
                      } catch (err) {
                        console.error("getParticipantData fallito:", err);
                      }
                    }
                  }

                  if (a && a.licenseId) {
                    const res = await saveCertFn({
                      data: {
                        certificate_number: cert,
                        license_id: a.licenseId,
                        license_key: a.licenseKey ?? null,
                        puk_code: currentPukForCert,
                        nome_snapshot: a.nome ?? null,
                        cf_snapshot: (a.cf ?? "").toUpperCase() || null,
                        ditta_snapshot: a.ditta ?? null,
                        luogo_nascita_snapshot: a.luogo || null,
                        data_nascita_snapshot: a.dataNascita || null,
                        test_score: finalScore,
                        test_result: "passed",
                      },
                    });
                    if (!res.ok) {
                      console.error("Errore salvataggio certificato:", res.error);
                    } else {
                      console.log("DEBUG email attestato:", {
                        email_sent: res.email_sent,
                        email_error: res.email_error,
                      });
                      localStorage.setItem(`attestato_cert_id_${currentPukForCert}`, res.id);
                      localStorage.setItem(`attestato_issued_at_${currentPukForCert}`, res.issued_at);
                      localStorage.setItem(certKey, res.certificate_number);
                      // Compatibilita' con eventuale codice legacy non ancora scopato
                      localStorage.setItem("attestato_cert_number", res.certificate_number);
                      localStorage.setItem("attestato_cert_id", res.id);
                      localStorage.setItem("attestato_issued_at", res.issued_at);
                    }
                  } else {
                    console.error(
                      "Impossibile determinare i dati anagrafici/licenza per il PUK corrente: certificato NON generato",
                    );
                  }
                } catch (err) {
                  console.error("Eccezione durante salvataggio:", err);
                }

                // Pulizia leggera: l'attestato per questo PUK è generato,
                // le chiavi di avanzamento video non servono più (il gate
                // di corso/test ora si basa comunque su getFunnelStatus,
                // non su queste chiavi). Non tocchiamo attestato_data /
                // lastActivation / attestato_cert_* / test_passed_*: servono
                // al recupero attestato multi-browser.
                for (const lesson of ["lezione1", "lezione2"]) {
                  localStorage.removeItem(`completed_${currentPukForCert}_${lesson}`);
                  localStorage.removeItem(`progress_${currentPukForCert}_${lesson}`);
                  localStorage.removeItem(`max_progress_${currentPukForCert}_${lesson}`);
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
