import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { VideoLesson, isLessonCompleted } from "@/components/VideoLesson";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

export const Route = createFileRoute("/corso")({
  head: () => ({
    meta: [
      { title: "Corso Privacy per Incaricati — Corporate Boost Service" },
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

function CorsoPage() {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(false);

  useEffect(() => {
    setC1(isLessonCompleted(LESSON_1));
    setC2(isLessonCompleted(LESSON_2));
  }, []);

  const allDone = c1 && c2;

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-10">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">
            Corso Privacy per Incaricati
          </h1>
          <p className="text-muted-foreground mt-2">
            Guarda entrambi i video in sequenza. Il test finale si sblocca quando hai
            completato tutti i moduli.
          </p>
        </header>

        <VideoLesson
          videoId={LESSON_1}
          videoUrl="https://www.w3schools.com/html/mov_bbb.mp4"
          title="Modulo 1 — Ruolo dell'incaricato"
          hideTestButton
          onCompletedChange={setC1}
        />

        <VideoLesson
          videoId={LESSON_2}
          videoUrl="https://www.w3schools.com/html/movie.mp4"
          title="Modulo 2 — Obblighi e gestione violazioni"
          hideTestButton
          locked={!c1}
          onCompletedChange={setC2}
        />

        <section className="rounded-xl border bg-card p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-semibold">Test finale</h2>
            <p className="text-sm text-muted-foreground mt-1">
              {allDone
                ? "Tutti i moduli completati. Puoi accedere al test."
                : "Completa entrambi i video per sbloccare il test."}
            </p>
          </div>
          {allDone ? (
            <Button asChild>
              <Link to="/test">Vai al test</Link>
            </Button>
          ) : (
            <Button
              disabled
              variant="secondary"
              className="opacity-60 cursor-not-allowed"
            >
              <Lock className="h-4 w-4" />
              Test bloccato
            </Button>
          )}
        </section>
      </div>
    </main>
  );
}
