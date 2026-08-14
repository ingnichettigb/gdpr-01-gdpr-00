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
import { setFunnelBlockReason } from "@/lib/funnel-messages";
import { LESSONS } from "@/lib/course-content";
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
    text: "Che cosa si intende per \"Dato Personale\" secondo il GDPR?",
    options: [
      { key: "A", label: "Solo informazioni sanitarie" },
      { key: "B", label: "Qualsiasi informazione riguardante una persona fisica identificata o identificabile" },
      { key: "C", label: "Solo dati economici e fiscali" },
      { key: "D", label: "Solo dati raccolti online" },
    ],
    correct: "B",
  },
  {
    id: "q2",
    text: "Qual è il principio di \"Liceità, Correttezza e Trasparenza\"?",
    options: [
      { key: "A", label: "Raccogliere dati senza informare l'interessato" },
      { key: "B", label: "Usare dati per scopi non dichiarati" },
      { key: "C", label: "Trattare i dati in modo leale, con base giuridica valida e informazioni chiare" },
      { key: "D", label: "Conservare i dati per sempre" },
    ],
    correct: "C",
  },
  {
    id: "q3",
    text: "Cosa richiede il principio di \"Limitazione della Finalità\"?",
    options: [
      { key: "A", label: "Dichiarare chiaramente perché si raccolgono i dati e non usarli per altri scopi" },
      { key: "B", label: "Conservare i dati per ogni possibile utilizzo futuro" },
      { key: "C", label: "Consentire l'uso dei dati da parte di terzi senza limiti" },
      { key: "D", label: "Applicare la regola solo ai dati sensibili" },
    ],
    correct: "A",
  },
  {
    id: "q4",
    text: "Cosa significa \"Minimizzazione dei Dati\"?",
    options: [
      { key: "A", label: "Raccogliere più dati possibile per sicurezza" },
      { key: "B", label: "Conservare dati anche se non servono" },
      { key: "C", label: "Raccogliere solo i dati strettamente necessari e pertinenti" },
      { key: "D", label: "Eliminare tutti i dati dopo 24 ore" },
    ],
    correct: "C",
  },
  {
    id: "q5",
    text: "Cosa prevede il principio di \"Esattezza\"?",
    options: [
      { key: "A", label: "Conservare i dati anche se obsoleti" },
      { key: "B", label: "Non correggere errori per evitare modifiche" },
      { key: "C", label: "Mantenere i dati corretti, aggiornati e privi di errori" },
      { key: "D", label: "Aggiornare i dati solo una volta all'anno" },
    ],
    correct: "C",
  },
  {
    id: "q6",
    text: "Cosa stabilisce la \"Limitazione della Conservazione\"?",
    options: [
      { key: "A", label: "Conservare i dati per sempre" },
      { key: "B", label: "Tenere i dati solo per il tempo necessario allo scopo dichiarato" },
      { key: "C", label: "Archiviare i dati senza regole" },
      { key: "D", label: "Distruggere i dati ogni settimana" },
    ],
    correct: "B",
  },
  {
    id: "q7",
    text: "Cosa garantisce il principio di \"Integrità e Riservatezza\"?",
    options: [
      { key: "A", label: "Accesso libero ai dati per tutti i dipendenti" },
      { key: "B", label: "Nessuna protezione contro perdite o furti" },
      { key: "C", label: "Protezione da accessi non autorizzati, perdita o modifica dei dati" },
      { key: "D", label: "Condivisione dei dati con fornitori senza controllo" },
    ],
    correct: "C",
  },
  {
    id: "q8",
    text: "Cosa significa \"Responsabilizzazione\" (Accountability)?",
    options: [
      { key: "A", label: "Delegare la privacy al DPO" },
      { key: "B", label: "Dimostrare con evidenze documentate la conformità al GDPR" },
      { key: "C", label: "Conservare solo le informative" },
      { key: "D", label: "Applicare il GDPR solo ai clienti" },
    ],
    correct: "B",
  },
  {
    id: "q9",
    text: "Chi è l'\"Interessato\" nel GDPR?",
    options: [
      { key: "A", label: "L'azienda che tratta i dati" },
      { key: "B", label: "Il DPO" },
      { key: "C", label: "La persona fisica a cui si riferiscono i dati personali" },
      { key: "D", label: "Il responsabile esterno" },
    ],
    correct: "C",
  },
  {
    id: "q10",
    text: "Qual è il ruolo del \"Responsabile del Trattamento\"?",
    options: [
      { key: "A", label: "Decide le finalità del trattamento" },
      { key: "B", label: "Tratta i dati per conto del Titolare seguendo istruzioni documentate" },
      { key: "C", label: "È il proprietario dei dati" },
      { key: "D", label: "È sempre interno all'azienda" },
    ],
    correct: "B",
  },
  {
    id: "q11",
    text: "Cosa prevede il concetto di \"Privacy by Design\"?",
    options: [
      { key: "A", label: "Applicare la privacy solo dopo la raccolta dei dati" },
      { key: "B", label: "Integrare la protezione dei dati fin dalla progettazione dei processi e sistemi" },
      { key: "C", label: "Limitarsi a informare gli utenti" },
      { key: "D", label: "Usare la privacy solo per i dati sensibili" },
    ],
    correct: "B",
  },
  {
    id: "q12",
    text: "Entro quanto tempo va notificato un \"Data Breach\" al Garante?",
    options: [
      { key: "A", label: "Entro 24 ore" },
      { key: "B", label: "Entro 72 ore dal momento in cui se ne viene a conoscenza" },
      { key: "C", label: "Entro una settimana" },
      { key: "D", label: "Solo se richiesto dall'interessato" },
    ],
    correct: "B",
  },
  {
    id: "q13",
    text: "Quali funzioni svolge il \"Garante per la Protezione dei Dati Personali\"?",
    options: [
      { key: "A", label: "Vigila sul rispetto del GDPR e può imporre sanzioni" },
      { key: "B", label: "Gestisce i backup aziendali" },
      { key: "C", label: "Redige contratti di lavoro" },
      { key: "D", label: "Fornisce assistenza tecnica ai titolari" },
    ],
    correct: "A",
  },
  {
    id: "q14",
    text: "Quali sono i requisiti per una password sicura?",
    options: [
      { key: "A", label: "Solo lettere minuscole" },
      { key: "B", label: "Nome e data di nascita dell'utente" },
      { key: "C", label: "Lunghezza superiore a 8 caratteri, caratteri misti e nessun riferimento personale" },
      { key: "D", label: "Password uguale per tutti i sistemi" },
    ],
    correct: "C",
  },
  {
    id: "q15",
    text: "Cosa è tassativamente vietato fare con documenti cartacei contenenti dati personali?",
    options: [
      { key: "A", label: "Archiviare in armadi chiusi" },
      { key: "B", label: "Consegnare solo a personale autorizzato" },
      { key: "C", label: "Riciclare carta contenente dati anche solo identificativi" },
      { key: "D", label: "Conservare copie di sicurezza" },
    ],
    correct: "C",
  },
];

export const PASS_THRESHOLD = 10;
export const TEST_QUESTION_COUNT = QUESTIONS.length;

// Elenco dei module_key dei 10 video del corso, derivato dalla fonte unica
// condivisa (course-content.ts) — così resta sempre allineato con corso.tsx.
export const ALL_LESSONS = LESSONS.map((l) => l.key);

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
          setFunnelBlockReason(status.reason);
          navigate({ to: "/attivazione" });
          return;
        }
        if (status.certified) {
          navigate({ to: "/corso-gia-completato" });
          return;
        }
        setAllowed(ALL_LESSONS.every((l) => status.completedModules.includes(l)));
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
            Rispondi alle {QUESTIONS.length} domande. Soglia di superamento: {PASS_THRESHOLD}/{QUESTIONS.length}.
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
                for (const lesson of ALL_LESSONS) {
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
                  : `Non hai raggiunto la soglia minima (${PASS_THRESHOLD}/${QUESTIONS.length}). Riprova.`}
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
