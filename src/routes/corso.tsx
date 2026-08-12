import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { VideoLesson, isLessonCompleted, currentPuk } from "@/components/VideoLesson";
import { markVideoCompleted } from "@/lib/video-progress.functions";
import { getFunnelStatus } from "@/lib/funnel-guard.functions";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, PlayCircle, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/corso")({
  head: () => ({
    meta: [
      { title: "Corso My Privacy — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Modulo formativo privacy con dieci video sequenziali e test finale a scelta multipla.",
      },
    ],
  }),
  component: CorsoPage,
});

// Elenco moduli video del corso, in sequenza. "key" è il module_key salvato
// su video_progress (Supabase) — NON cambiare i valori esistenti (lezione1,
// lezione2) per non perdere la corrispondenza con i completamenti già
// registrati.
const LESSONS: { key: string; title: string; videoUrl: string }[] = [
  {
    key: "lezione1",
    title: "Modulo 1 — My Privacy: il Regolamento europeo in materia di protezione dei dati personali",
    videoUrl: "https://youtu.be/7M1kTqg_UlE",
  },
  {
    key: "lezione2",
    title: "Modulo 2 — I 7 Principi del GDPR (prima parte)",
    videoUrl: "https://youtu.be/qtAdKxFazjs",
  },
  {
    key: "lezione3",
    title: "Modulo 3 — I 7 Principi del GDPR (seconda parte)",
    videoUrl: "https://youtu.be/e8A71MhwGYI",
  },
  {
    key: "lezione4",
    title: "Modulo 4 — L'Interessato",
    videoUrl: "https://youtu.be/Wwkun2SeetI",
  },
  {
    key: "lezione5",
    title: "Modulo 5 — Le Figure Chiave del GDPR",
    videoUrl: "https://youtu.be/iSxAr5izHrQ",
  },
  {
    key: "lezione6",
    title: "Modulo 6 — Un Nuovo Approccio",
    videoUrl: "https://youtu.be/qe62Se_HgVo",
  },
  {
    key: "lezione7",
    title: "Modulo 7 — Responsabilità e Sanzioni",
    videoUrl: "https://youtu.be/aJL1c7LzP6E",
  },
  {
    key: "lezione8",
    title: "Modulo 8 — Privacy come Processo Continuo",
    videoUrl: "https://youtu.be/pNXYDiyDV_M",
  },
  {
    key: "lezione9",
    title: "Modulo 9 — Documenti Cartacei",
    videoUrl: "https://youtu.be/2-q_BCWPDpk",
  },
  {
    key: "lezione10",
    title: "Modulo 10 — Governance e Compliance GDPR",
    videoUrl: "https://youtu.be/CmMerixgD-0",
  },
];

type StepKey = `mod${number}` | "test";

function CorsoPage() {
  const navigate = useNavigate();
  // completed[i] = true se LESSONS[i] è stato completato
  const [completed, setCompleted] = useState<boolean[]>(() => LESSONS.map(() => false));
  const [active, setActive] = useState<StepKey>("mod1");
  const getStatusFn = useServerFn(getFunnelStatus);
  const markCompletedFn = useServerFn(markVideoCompleted);
  const puk = currentPuk();

  useEffect(() => {
    (async () => {
      if (puk === "no-puk") {
        navigate({ to: "/attivazione" });
        return;
      }

      const doneArr = LESSONS.map((l) => isLessonCompleted(l.key));

      // Rivalida SEMPRE col server: il PUK risolto lato client (anche via
      // fallback localStorage per il recupero cross-browser) deve essere
      // un PUK/licenza realmente valida adesso, non solo "un PUK che una
      // volta ha completato qualcosa su questo browser".
      try {
        const status = await getStatusFn({ data: { puk } });
        if (!status.valid) {
          navigate({ to: "/attivazione" });
          return;
        }
        if (status.certified) {
          navigate({ to: "/corso-gia-completato" });
          return;
        }
        // Allinea con lo stato reale del server (fonte di verità), scrive
        // anche in localStorage per coerenza futura/offline-first.
        LESSONS.forEach((l, i) => {
          if (status.completedModules.includes(l.key) && !doneArr[i]) {
            localStorage.setItem(`completed_${puk}_${l.key}`, "true");
            doneArr[i] = true;
          }
        });
      } catch (err) {
        console.error("getFunnelStatus fallito:", err);
        navigate({ to: "/attivazione" });
        return;
      }

      setCompleted(doneArr);
      // Auto-avanza al primo modulo non completato all'apertura
      const firstIncomplete = doneArr.findIndex((d) => !d);
      if (firstIncomplete === -1) setActive("test");
      else if (firstIncomplete > 0) setActive(`mod${firstIncomplete + 1}` as StepKey);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puk]);

  // Avanza automaticamente solo alla TRANSIZIONE da non-completato a completato
  // (non al semplice re-mount di un modulo già superato).
  // Il completamento è monodirezionale: ignoriamo le notifiche `false`
  // (che il child emette al mount prima di leggere localStorage), altrimenti
  // aprendo un modulo già superato azzereremmo lo stato e ri-scateneremmo
  // l'auto-avanzamento.
  const handleModuleComplete = (index: number) => (done: boolean) => {
    if (!done) return;
    const wasAlreadyCompleted = completed[index];
    setCompleted((prev) => {
      if (prev[index]) return prev; // già segnato, nessuna transizione
      const next = [...prev];
      next[index] = true;
      return next;
    });
    // Avanza SOLO se il modulo non era già completato prima d'ora: altrimenti
    // riaprire un video già visto per rivederlo (es. tornare al Modulo 2
    // mentre si è al Modulo 5) provocherebbe un salto automatico al modulo
    // successivo, impedendo di fatto la revisione.
    if (wasAlreadyCompleted) return;
    setActive((prevActive) => {
      if (prevActive !== `mod${index + 1}`) return prevActive;
      return index + 1 < LESSONS.length ? (`mod${index + 2}` as StepKey) : "test";
    });
  };

  const allCompleted = completed.every(Boolean);

  const steps: {
    key: StepKey;
    label: string;
    subtitle: string;
    icon: typeof PlayCircle;
    unlocked: boolean;
    completed: boolean;
  }[] = [
    ...LESSONS.map((l, i) => ({
      key: `mod${i + 1}` as StepKey,
      label: `Modulo ${i + 1}`,
      subtitle: l.title.replace(/^Modulo \d+ — /, ""),
      icon: PlayCircle,
      unlocked: i === 0 || completed[i - 1],
      completed: completed[i],
    })),
    {
      key: "test",
      label: "Test finale",
      subtitle: "Quiz a scelta multipla",
      icon: GraduationCap,
      unlocked: allCompleted,
      completed: false,
    },
  ];

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: "#003153" }}>
              Corso My Privacy
            </h1>
            <p className="text-muted-foreground mt-2">
              Segui i moduli in sequenza. Usa il carosello in basso per rivedere quelli
              già completati.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              // Il progresso (video completati + punto di riproduzione) è già
              // salvato in tempo reale, sia in localStorage sia su Supabase
              // (video_progress) — questo pulsante serve solo a dare
              // un'uscita esplicita e rassicurante, non a "salvare" qualcosa
              // che non lo sia già.
              window.alert(
                "Il tuo avanzamento è stato salvato. Potrai riprendere da dove hai lasciato tornando su questa pagina, anche da un altro momento.",
              );
              window.location.href = "/";
            }}
            className="shrink-0"
          >
            Esci — Clicca qui per uscire
          </Button>
        </header>

        {/* Area attiva */}
        <section className="animate-fade-in">
          {LESSONS.map((l, i) => {
            const stepKey = `mod${i + 1}` as StepKey;
            if (active !== stepKey) return null;
            const locked = i > 0 && !completed[i - 1];
            return (
              <VideoLesson
                key={l.key}
                videoId={l.key}
                videoUrl={l.videoUrl}
                title={l.title}
                hideTestButton
                locked={locked}
                serverCompleted={completed[i]}
                onCompletedChange={handleModuleComplete(i)}
                onEnded={async () => {
                  if (puk === "no-puk") return;
                  try {
                    await markCompletedFn({ data: { puk, moduleKey: l.key } });
                  } catch (err) {
                    console.error(`markVideoCompleted (${l.key}) fallito:`, err);
                  }
                }}
              />
            );
          })}
          {active === "test" && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: "#003153" }}>
                Test finale
              </h2>
              <p className="text-sm text-muted-foreground">
                {allCompleted
                  ? "Hai completato tutti i moduli. Puoi accedere al test finale."
                  : "Completa tutti i moduli per sbloccare il test."}
              </p>
              {allCompleted ? (
                <Button asChild>
                  <Link to="/test">Vai al test</Link>
                </Button>
              ) : (
                <Button disabled variant="secondary" className="opacity-60">
                  <Lock className="h-4 w-4" />
                  Test bloccato
                </Button>
              )}
            </div>
          )}
        </section>

        {/* Carosello step */}
        <nav
          aria-label="Progresso del corso"
          className="scrollbar-always-visible border-t pt-4 -mx-4 px-4 overflow-x-auto"
        >
          <ul className="flex gap-3 min-w-max pb-2">
            {steps.map((s) => {
              const isActive = active === s.key;
              const clickable = s.unlocked;
              const Icon = s.icon;
              const cardClass = cn(
                "relative w-40 text-left rounded-lg border-2 p-3 transition-all",
                "flex flex-col gap-1",
                isActive
                  ? "shadow-md bg-card"
                  : clickable
                    ? "border-border bg-card hover:border-[#003153]/40 hover:bg-accent/40"
                    : "border-border/60 bg-muted/30 cursor-not-allowed",
              );
              const cardStyle = isActive ? { borderColor: "#003153" } : undefined;
              const inner = (
                <>
                  <div className="flex items-center justify-between">
                    <Icon
                      className={cn("h-5 w-5", !clickable && "text-muted-foreground")}
                      style={{ color: clickable ? "#003153" : undefined }}
                    />
                    {s.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : !clickable ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      "text-sm font-semibold",
                      !clickable && "text-foreground/70",
                    )}
                    style={clickable ? { color: "#003153" } : undefined}
                  >
                    {s.label}
                  </div>
                  <div className="text-xs text-foreground/60 truncate">
                    {s.subtitle}
                  </div>
                </>
              );
              return (
                <li key={s.key}>
                  {s.key === "test" && clickable ? (
                    <Link
                      to="/test"
                      className={cardClass}
                      style={cardStyle}
                      title={`${s.label} — ${s.subtitle}`}
                    >
                      {inner}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => clickable && setActive(s.key)}
                      disabled={!clickable}
                      aria-current={isActive ? "step" : undefined}
                      className={cardClass}
                      style={cardStyle}
                      title={`${s.label} — ${s.subtitle}`}
                    >
                      {inner}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </main>
  );
}
