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
          "Modulo formativo privacy con due video sequenziali e test finale a scelta multipla.",
      },
    ],
  }),
  component: CorsoPage,
});

const LESSON_1 = "lezione1";
const LESSON_2 = "lezione2";

type StepKey = "mod1" | "mod2" | "test";

function CorsoPage() {
  const navigate = useNavigate();
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);
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

      let done1 = isLessonCompleted(LESSON_1);
      let done2 = isLessonCompleted(LESSON_2);

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
        if (status.module1 && !done1) {
          localStorage.setItem(`completed_${puk}_${LESSON_1}`, "true");
          done1 = true;
        }
        if (status.module2 && !done2) {
          localStorage.setItem(`completed_${puk}_${LESSON_2}`, "true");
          done2 = true;
        }
      } catch (err) {
        console.error("getFunnelStatus fallito:", err);
        navigate({ to: "/attivazione" });
        return;
      }

      setC1(done1);
      setC2(done2);
      // Auto-avanza al primo step non completato all'apertura
      if (done1 && !done2) setActive("mod2");
      else if (done1 && done2) setActive("test");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puk]);

  // Avanza automaticamente solo alla TRANSIZIONE da non-completato a completato
  // (non al semplice re-mount di un modulo già superato)
  // Il completamento è monodirezionale: ignoriamo le notifiche `false`
  // (che il child emette al mount prima di leggere localStorage), altrimenti
  // aprendo un modulo già superato azzereremmo lo stato e ri-scateneremmo
  // l'auto-avanzamento.
  const handleC1 = (done: boolean) => {
    if (!done) return;
    if (!c1 && active === "mod1") setActive("mod2");
    setC1(true);
  };
  const handleC2 = (done: boolean) => {
    if (!done) return;
    if (!c2 && active === "mod2") setActive("test");
    setC2(true);
  };

  const steps: {
    key: StepKey;
    label: string;
    subtitle: string;
    icon: typeof PlayCircle;
    unlocked: boolean;
    completed: boolean;
  }[] = [
    {
      key: "mod1",
      label: "Modulo 1",
      subtitle: "Guida Pratica",
      icon: PlayCircle,
      unlocked: true,
      completed: c1,
    },
    {
      key: "mod2",
      label: "Modulo 2",
      subtitle: "Processo continuo",
      icon: PlayCircle,
      unlocked: c1,
      completed: c2,
    },
    {
      key: "test",
      label: "Test finale",
      subtitle: "Quiz a scelta multipla",
      icon: GraduationCap,
      unlocked: c1 && c2,
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
          {active === "mod1" && (
            <VideoLesson
              videoId={LESSON_1}
              videoUrl="https://www.w3schools.com/html/mov_bbb.mp4"
              title="Modulo 1 — Guida Pratica per l'Addetto e l'Incaricato"
              hideTestButton
              onCompletedChange={handleC1}
              onEnded={async () => {
                if (puk === "no-puk") return;
                try {
                  await markCompletedFn({ data: { puk, moduleKey: LESSON_1 } });
                } catch (err) {
                  console.error("markVideoCompleted (modulo 1) fallito:", err);
                }
              }}
            />
          )}
          {active === "mod2" && (
            <VideoLesson
              videoId={LESSON_2}
              videoUrl="https://www.w3schools.com/html/movie.mp4"
              title="Modulo 2 — Privacy come processo continuo"
              hideTestButton
              locked={!c1}
              onCompletedChange={handleC2}
              onEnded={async () => {
                if (puk === "no-puk") return;
                try {
                  await markCompletedFn({ data: { puk, moduleKey: LESSON_2 } });
                } catch (err) {
                  console.error("markVideoCompleted (modulo 2) fallito:", err);
                }
              }}
            />
          )}
          {active === "test" && (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: "#003153" }}>
                Test finale
              </h2>
              <p className="text-sm text-muted-foreground">
                {c1 && c2
                  ? "Hai completato tutti i moduli. Puoi accedere al test finale."
                  : "Completa entrambi i moduli per sbloccare il test."}
              </p>
              {c1 && c2 ? (
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
          className="border-t pt-4 -mx-4 px-4 overflow-x-auto"
        >
          <ul className="flex gap-3 min-w-max pb-2">
            {steps.map((s) => {
              const isActive = active === s.key;
              const clickable = s.unlocked;
              const Icon = s.icon;
              const cardClass = cn(
                "relative w-40 text-left rounded-lg border p-3 transition-all",
                "flex flex-col gap-1",
                isActive
                  ? "border-2 shadow-md bg-card"
                  : "border-border bg-card/60 hover:bg-card",
                !clickable && "opacity-50 cursor-not-allowed hover:bg-card/60",
              );
              const cardStyle = isActive ? { borderColor: "#003153" } : undefined;
              const inner = (
                <>
                  <div className="flex items-center justify-between">
                    <Icon
                      className="h-5 w-5"
                      style={{ color: clickable ? "#003153" : undefined }}
                    />
                    {s.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : !clickable ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: "#003153" }}>
                    {s.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {s.subtitle}
                  </div>
                </>
              );
              return (
                <li key={s.key}>
                  {s.key === "test" && clickable ? (
                    <Link to="/test" className={cardClass} style={cardStyle}>
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
