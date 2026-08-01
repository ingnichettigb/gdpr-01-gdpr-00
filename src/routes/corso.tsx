import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useState } from "react";
import { VideoLesson } from "@/components/VideoLesson";
import { Button } from "@/components/ui/button";
import { Lock, CheckCircle2, PlayCircle, GraduationCap, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getUserId } from "@/lib/activation";
import { getCourseModules, getCourseProgress, markModuleCompleted } from "@/lib/course.functions";
import type { CourseModuleDTO } from "@/lib/course.types";

export const Route = createFileRoute("/corso")({
  head: () => ({
    meta: [
      { title: "Corso My Privacy — Corporate Boost Service" },
      {
        name: "description",
        content:
          "Modulo formativo privacy con video sequenziali e test finale a scelta multipla.",
      },
    ],
  }),
  component: CorsoPage,
});

const PRUSSIAN = "#003153";

function CorsoPage() {
  const navigate = useNavigate();
  const modulesFn = useServerFn(getCourseModules);
  const progressFn = useServerFn(getCourseProgress);
  const markFn = useServerFn(markModuleCompleted);

  const [modules, setModules] = useState<CourseModuleDTO[]>([]);
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [active, setActive] = useState<string>("test");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const mods = await modulesFn({});
        setModules(mods.modules);
        const uid = getUserId();
        let done: string[] = [];
        if (uid) {
          const progress = await progressFn({ data: { userId: uid } });
          done = progress.completedModuleIds;
          setCompletedIds(done);
        }
        // Apri il primo modulo non completato, altrimenti il test finale.
        const next = mods.modules.find((m) => !done.includes(m.id));
        setActive(next ? next.id : "test");
      } catch (err) {
        console.error("corso load error", err);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDone = useCallback(
    (id: string) => completedIds.includes(id),
    [completedIds],
  );
  const allDone = modules.length > 0 && modules.every((m) => isDone(m.id));

  const handleModuleEnded = useCallback(
    async (moduleId: string) => {
      setCompletedIds((prev) =>
        prev.includes(moduleId) ? prev : [...prev, moduleId],
      );
      const uid = getUserId();
      if (uid) {
        try {
          await markFn({ data: { userId: uid, moduleId } });
        } catch (err) {
          console.error("markModuleCompleted error", err);
        }
      }
      // Avanza al modulo successivo (o al test finale)
      const idx = modules.findIndex((m) => m.id === moduleId);
      const next = modules[idx + 1];
      setActive(next ? next.id : "test");
    },
    [markFn, modules],
  );

  const steps = [
    ...modules.map((m, i) => ({
      key: m.id,
      label: `Modulo ${i + 1}`,
      subtitle: m.title,
      icon: PlayCircle,
      unlocked: i === 0 || isDone(modules[i - 1]!.id),
      completed: isDone(m.id),
    })),
    {
      key: "test",
      label: "Test finale",
      subtitle: "Quiz a scelta multipla",
      icon: GraduationCap,
      unlocked: allDone,
      completed: false,
    },
  ];

  const activeIndex = modules.findIndex((m) => m.id === active);
  const activeModule = activeIndex >= 0 ? modules[activeIndex] : undefined;

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ color: PRUSSIAN }}>
              Corso My Privacy
            </h1>
            <p className="text-muted-foreground mt-2">
              Segui i moduli in sequenza. Usa il carosello in basso per rivedere quelli
              già completati.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate({ to: "/" })}>
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </header>

        {/* Area attiva */}
        <section className="animate-fade-in">
          {loading ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              Caricamento dei moduli…
            </div>
          ) : modules.length === 0 ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              Nessun modulo disponibile per questo corso.
            </div>
          ) : activeModule ? (
            <VideoLesson
              key={activeModule.id}
              videoId={activeModule.id}
              videoUrl={activeModule.youtube_url ?? ""}
              title={`Modulo ${activeIndex + 1} — ${activeModule.title}`}
              hideTestButton
              locked={activeIndex > 0 && !isDone(modules[activeIndex - 1]!.id)}
              serverCompleted={isDone(activeModule.id)}
              onEnded={() => handleModuleEnded(activeModule.id)}
            />
          ) : (
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="text-xl font-semibold" style={{ color: PRUSSIAN }}>
                Test finale
              </h2>
              <p className="text-sm text-muted-foreground">
                {allDone
                  ? "Hai completato tutti i moduli. Puoi accedere al test finale."
                  : "Completa tutti i moduli per sbloccare il test."}
              </p>
              {allDone ? (
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
              const cardStyle = isActive ? { borderColor: PRUSSIAN } : undefined;
              const inner = (
                <>
                  <div className="flex items-center justify-between">
                    <Icon
                      className="h-5 w-5"
                      style={{ color: clickable ? PRUSSIAN : undefined }}
                    />
                    {s.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : !clickable ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : null}
                  </div>
                  <div className="text-sm font-semibold" style={{ color: PRUSSIAN }}>
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
